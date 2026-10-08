"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  X, Zap, Camera, CheckCircle2, RefreshCcw, RadioTower,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCameraStream } from "@/hooks/use-camera-stream";
import {
  type VolumetricScanResult,
  SCAN_INTERVAL_MS,
  SCAN_INTERVAL_STABLE_MS,
  SCAN_INTERVAL_LOCKED_MS,
  FIRST_SCAN_DELAY_MS,
  MIN_SCAN_INTERVAL_MS,
  FRAME_HASH_DIFF_THRESHOLD,
  STABLE_THRESHOLD,
  PHASE_TEXTS,
  computeFrameHash,
  hammingDistance,
  captureFrameAsFile,
  isMeaningfullyDifferent,
  confidenceRank,
  tryVibrate,
} from "@/lib/scan/frame-utils";
import { drawVolumetricFrame, type DepthDot } from "@/lib/scan/volumetric-overlay";
import { LiveResultCard } from "./live-result-card";
import { logger } from "@/lib/logger";

export type { VolumetricScanResult } from "@/lib/scan/frame-utils";

interface LiveScannerProps {
  /** Analiza un frame y devuelve un resultado. La función puede lanzar; el scanner reintenta. */
  analyzeFrame: (file: File) => Promise<VolumetricScanResult | null>;
  /** El usuario aceptó el resultado actual. */
  onConfirm: (result: VolumetricScanResult) => void;
  onClose: () => void;
}

export function LiveScanner({ analyzeFrame, onConfirm, onClose }: LiveScannerProps) {
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Animación
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(performance.now());
  const dotsRef = useRef<DepthDot[]>([]);

  // Loop de scan
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanAtRef = useRef<number>(0);
  const lastHashRef = useRef<string | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const errorStreakRef = useRef<number>(0);
  const closedRef = useRef<boolean>(false);
  const analyzeFrameRef = useRef(analyzeFrame);
  useEffect(() => { analyzeFrameRef.current = analyzeFrame; }, [analyzeFrame]);

  const { videoRef, ready, error: camError } = useCameraStream(() => {
    startTimeRef.current = performance.now();
  });

  // UI state
  const [result, setResult] = useState<VolumetricScanResult | null>(null);
  const [previousResult, setPreviousResult] = useState<VolumetricScanResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stableCount, setStableCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Marca el scanner como cerrado al desmontar y limpia el timer del loop.
  useEffect(() => {
    closedRef.current = false;
    return () => {
      closedRef.current = true;
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, []);

  // ─── Canvas resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ─── Scan loop ──────────────────────────────────────────────────────────────
  const scanTick = useCallback(async () => {
    if (closedRef.current) return;
    if (!videoRef.current || !ready || inFlightRef.current) {
      scheduleNext(SCAN_INTERVAL_MS);
      return;
    }

    const now = performance.now();
    if (now - lastScanAtRef.current < MIN_SCAN_INTERVAL_MS) {
      scheduleNext(MIN_SCAN_INTERVAL_MS);
      return;
    }

    // ¿La escena cambió desde el último scan? Si no, esperar más.
    const hash = computeFrameHash(videoRef.current);
    const prevHash = lastHashRef.current;
    const dist = hash && prevHash ? hammingDistance(hash, prevHash) : 64;
    const hasResultAlready = !!result;

    if (hasResultAlready && hash && prevHash && dist < FRAME_HASH_DIFF_THRESHOLD) {
      // La cámara apunta a lo mismo: no quemamos cuota.
      scheduleNext(stableCount >= STABLE_THRESHOLD ? SCAN_INTERVAL_LOCKED_MS : SCAN_INTERVAL_STABLE_MS);
      return;
    }

    const file = await captureFrameAsFile(videoRef.current);
    if (!file) {
      scheduleNext(SCAN_INTERVAL_MS);
      return;
    }

    inFlightRef.current = true;
    setIsAnalyzing(true);
    setPhaseIdx((p) => (p + 1) % PHASE_TEXTS.length);
    lastScanAtRef.current = now;
    lastHashRef.current = hash;

    try {
      const next = await analyzeFrameRef.current(file);
      if (closedRef.current) return;
      errorStreakRef.current = 0;
      setBannerError(null);

      if (next && next.foodName) {
        setScanCount((c) => c + 1);
        applyNewResult(next);
      }
    } catch (e) {
      errorStreakRef.current++;
      logger.warn("volumetric scan error", e);
      if (errorStreakRef.current >= 2 && !result) {
        setBannerError("No se pudo analizar. Reintentando…");
      }
    } finally {
      if (!closedRef.current) {
        inFlightRef.current = false;
        setIsAnalyzing(false);
        // Cadencia adaptativa.
        const nextMs =
          stableCount >= STABLE_THRESHOLD ? SCAN_INTERVAL_LOCKED_MS :
            result ? SCAN_INTERVAL_STABLE_MS : SCAN_INTERVAL_MS;
        scheduleNext(nextMs);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, result, stableCount]);

  const scheduleNext = useCallback((ms: number) => {
    if (closedRef.current) return;
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    loopTimerRef.current = setTimeout(() => { void scanTick(); }, ms);
  }, [scanTick]);

  // Aplica un nuevo resultado decidiendo si reemplaza o consolida el actual.
  const applyNewResult = useCallback((next: VolumetricScanResult) => {
    setResult((prev) => {
      if (!prev) {
        tryVibrate(40);
        return next;
      }
      const different = isMeaningfullyDifferent(prev, next);
      const newIsMoreConfident =
        confidenceRank(next.aiContext?.confidence) > confidenceRank(prev.aiContext?.confidence);

      if (different) {
        setPreviousResult(prev);
        setStableCount(1);
        tryVibrate([30, 60, 30]); // patrón de "cambio detectado"
        return next;
      }

      // Mismo plato → consolidamos. Prefiere el de mayor confianza para mostrar.
      setStableCount((c) => Math.min(STABLE_THRESHOLD + 2, c + 1));
      if (newIsMoreConfident) {
        tryVibrate(20);
        return next;
      }
      return prev;
    });
  }, []);

  // Arrancar el loop una vez la cámara está lista.
  useEffect(() => {
    if (!ready) return;
    scheduleNext(FIRST_SCAN_DELAY_MS);
    return () => { if (loopTimerRef.current) clearTimeout(loopTimerRef.current); };
  }, [ready, scheduleNext]);

  // ─── Volumetric overlay animation ──────────────────────────────────────────
  const animate = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    dotsRef.current = drawVolumetricFrame({
      ctx,
      W: canvas.width,
      H: canvas.height,
      dpr: devicePixelRatio || 1,
      elapsed: now - startTimeRef.current,
      now,
      isAnalyzing,
      dots: dotsRef.current,
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [isAnalyzing]);

  useEffect(() => {
    if (ready) rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, animate]);

  // ─── Manual actions ────────────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    if (!result) return;
    tryVibrate(80);
    closedRef.current = true;
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    onConfirm(result);
  }, [result, onConfirm]);

  const handleClear = useCallback(() => {
    tryVibrate(10);
    setResult(null);
    setPreviousResult(null);
    setStableCount(0);
    setScanCount(0);
    lastHashRef.current = null;
    setBannerError(null);
    // Disparar un nuevo scan rápido.
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    loopTimerRef.current = setTimeout(() => { void scanTick(); }, 400);
  }, [scanTick]);

  const isStable = stableCount >= STABLE_THRESHOLD;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "screen" }}
      />

      {/* Barra superior */}
      <div className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex min-w-0 items-center gap-2 rounded-full bg-black/60 px-3.5 py-2 text-sm font-medium text-white">
            <Zap className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Escáner en vivo</span>
          </span>
          {scanCount > 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 text-xs font-medium text-white/80 tabular"
            >
              <RadioTower className="h-3.5 w-3.5 text-primary" />
              {scanCount} {scanCount > 1 ? "lecturas" : "lectura"}
            </motion.span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar escáner"
          className="shrink-0 rounded-full bg-black/60 text-white hover:bg-black/80 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Retícula mientras no hay resultado */}
      {ready && !camError && !result && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative"
            style={{ width: "72vmin", height: "64vmin" }}
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            {[
              "top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl",
              "top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl",
              "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl",
              "bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl",
            ].map((cls, i) => (
              <div key={i} className={cn("absolute h-9 w-9 border-primary", cls)} />
            ))}
            <p className="absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white/70">
              Centra el plato, se analiza solo
            </p>
          </motion.div>
        </div>
      )}

      {/* Aviso de error transitorio */}
      <AnimatePresence>
        {bannerError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2 px-4"
          >
            <p className="rounded-full bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground">
              {bannerError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultado flotante */}
      <AnimatePresence mode="popLayout">
        {result && (
          <motion.div
            key={result.foodName + result.calories}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-x-0 top-24 z-10 flex items-center justify-center px-4"
          >
            <LiveResultCard
              result={result}
              previousResult={previousResult}
              isAnalyzing={isAnalyzing}
              isStable={isStable}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles inferiores */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
        <AnimatePresence>
          {isAnalyzing && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-medium text-white"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              {PHASE_TEXTS[phaseIdx]}
            </motion.p>
          )}
        </AnimatePresence>

        {result ? (
          <div className="flex w-full max-w-sm gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              aria-label="Volver a escanear"
              className="h-12 w-12 shrink-0 rounded-full border-white/25 bg-black/50 text-white hover:bg-black/70 hover:text-white"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button onClick={handleConfirm} className="h-12 flex-1 rounded-full text-base">
              <CheckCircle2 className="h-5 w-5" />
              {isStable ? "Confirmar (estable)" : "Confirmar resultado"}
            </Button>
          </div>
        ) : (
          <p className="rounded-full bg-black/60 px-5 py-2.5 text-sm text-white/80">
            Apunta al plato y la IA lo analiza en vivo
          </p>
        )}
      </div>

      {/* Iniciando */}
      {!ready && !camError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-white/80">Activando cámara…</p>
        </div>
      )}

      {/* Error de cámara */}
      {camError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-8 text-center">
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/20 text-destructive">
            <Camera className="h-6 w-6" />
          </span>
          <p className="mb-2 text-lg font-semibold text-white">Cámara no disponible</p>
          <p className="mb-8 max-w-sm text-sm text-white/70">{camError}</p>
          <Button
            onClick={onClose}
            variant="outline"
            className="h-11 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            Volver
          </Button>
        </div>
      )}
    </div>
  );
}
