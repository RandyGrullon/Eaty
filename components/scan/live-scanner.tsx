"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  X, Zap, Sparkles, Camera, CheckCircle2, RefreshCcw, RadioTower,
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
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: "screen" }}
      />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 pt-12 pb-3 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-black/55 backdrop-blur-md px-4 py-2 border border-white/10">
            <p className="text-white text-[11px] font-black flex items-center gap-2 uppercase tracking-[0.2em]">
              <Zap className="h-3 w-3 text-emerald-400" />
              Escáner Volumétrico
            </p>
          </div>
          {scanCount > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full bg-black/55 backdrop-blur-md px-3 py-2 border border-white/10"
            >
              <p className="text-white/70 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <RadioTower className="h-3 w-3 text-emerald-400" />
                {scanCount} scan{scanCount > 1 ? "s" : ""}
              </p>
            </motion.div>
          )}
        </div>
        <Button
          variant="ghost" size="icon"
          onClick={onClose}
          className="rounded-full bg-black/55 text-white hover:bg-black/75 border border-white/10 backdrop-blur-md"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Center reticle while no result */}
      {ready && !camError && !result && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
              <div
                key={i}
                className={cn("absolute w-9 h-9 border-emerald-400", cls)}
                style={{ boxShadow: "0 0 14px rgba(52,211,153,0.5)" }}
              />
            ))}
            <p className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/55 tracking-widest uppercase whitespace-nowrap">
              Centra el plato — análisis automático
            </p>
          </motion.div>
        </div>
      )}

      {/* Banner error transitorio */}
      <AnimatePresence>
        {bannerError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
          >
            <div className="rounded-full bg-red-500/20 border border-red-400/40 backdrop-blur-md px-4 py-2">
              <p className="text-red-100 text-[10px] font-bold uppercase tracking-widest">{bannerError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating live result card */}
      <AnimatePresence mode="popLayout">
        {result && (
          <motion.div
            key={result.foodName + result.calories}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -10 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="absolute inset-x-0 top-28 z-10 flex items-center justify-center pointer-events-none px-5"
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

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 pb-[calc(2.5rem_+_env(safe-area-inset-bottom))] px-6 z-10 flex flex-col items-center gap-3 pointer-events-auto">
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="rounded-full bg-black/60 backdrop-blur-md border border-emerald-400/25 px-4 py-1.5"
            >
              <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                {PHASE_TEXTS[phaseIdx]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {result ? (
          <div className="flex gap-3 w-full max-w-sm">
            <Button
              variant="outline"
              onClick={handleClear}
              className="rounded-2xl h-14 px-4 font-black border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleConfirm}
              className={cn(
                "flex-1 rounded-2xl h-14 font-black text-black shadow-xl transition-all",
                isStable
                  ? "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-400/40"
                  : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25"
              )}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {isStable ? "Confirmar (estable)" : "Confirmar resultado"}
            </Button>
          </div>
        ) : (
          <div className="rounded-full bg-black/55 backdrop-blur-md border border-white/15 px-5 py-2.5">
            <p className="text-white/70 text-[11px] font-medium tracking-wide">
              Apunta al plato — la IA analiza en vivo
            </p>
          </div>
        )}
      </div>

      {/* Initializing */}
      {!ready && !camError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black gap-4">
          <div className="w-12 h-12 rounded-full border-[2.5px] border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-emerald-400/80 text-sm font-black tracking-widest uppercase">
            Activando Cámara...
          </p>
        </div>
      )}

      {/* Camera error */}
      {camError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-8 text-center">
          <div className="h-16 w-16 bg-red-500/15 rounded-full flex items-center justify-center mb-5">
            <Camera className="h-8 w-8 text-red-400" />
          </div>
          <p className="font-black text-white text-lg mb-2">Cámara no disponible</p>
          <p className="text-sm text-white/55 mb-8">{camError}</p>
          <Button onClick={onClose} variant="outline" className="rounded-xl bg-white/10 border-white/20 hover:bg-white/20 text-white">
            Volver atrás
          </Button>
        </div>
      )}
    </div>
  );
}
