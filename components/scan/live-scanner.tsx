"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  X, Zap, Flame, Beef, Wheat, Droplets as FatIcon, Sparkles, ScanLine,
  Camera, CheckCircle2, RefreshCcw, RadioTower,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

export interface VolumetricScanResult {
  foodName: string;
  calories: number;
  macros: { protein: number; carbs: number; fat: number; fiber?: number; sugar?: number };
  aiContext?: {
    confidence?: "low" | "medium" | "high";
    portionLabel?: string;
    containerType?: string;
    estimatedWeightGrams?: number;
    componentBreakdown?: Array<{ name: string; estimatedGrams?: number; calories?: number }>;
  };
  [k: string]: unknown;
}

interface LiveScannerProps {
  /** Analiza un frame y devuelve un resultado. La función puede lanzar; el scanner reintenta. */
  analyzeFrame: (file: File) => Promise<VolumetricScanResult | null>;
  /** El usuario aceptó el resultado actual. */
  onConfirm: (result: VolumetricScanResult) => void;
  onClose: () => void;
}

interface DepthDot {
  x: number;
  y: number;
  z: number; // 0 = lejos, 1 = cerca → afecta tamaño/opacidad/parallax
  vx: number;
  vy: number;
  opacity: number;
  colorRgb: string;
  born: number;
}

const C_GREEN = "52, 211, 153";
const C_BLUE = "96, 165, 250";
const C_ORANGE = "251, 146, 60";
const C_PURPLE = "168, 85, 247";

// ─── Timing del loop volumétrico ──────────────────────────────────────────────
const SCAN_INTERVAL_MS = 3500;          // Mientras buscamos algo nuevo
const SCAN_INTERVAL_STABLE_MS = 7000;   // Una vez estabilizado
const SCAN_INTERVAL_LOCKED_MS = 12000;  // Cuando ya tenemos resultado de alta confianza
const FIRST_SCAN_DELAY_MS = 1200;       // Margen para que el usuario encuadre
const MIN_SCAN_INTERVAL_MS = 2200;      // Distancia mínima entre scans (anti-spam)
const FRAME_HASH_DIFF_THRESHOLD = 9;    // Bits distintos (de 64) para considerar frame nuevo
const STABLE_THRESHOLD = 2;             // Nº de scans consecutivos coherentes → "estable"
const MEANINGFUL_CAL_DELTA = 0.18;      // 18% de variación en kcal → cambio significativo

const PHASE_TEXTS = [
  "Mapeando volumen...",
  "Analizando densidad...",
  "Reconociendo ingredientes...",
  "Calibrando porción...",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Calcula un hash perceptual aHash 8x8 del video actual. Devuelve string de 64 bits. */
function computeFrameHash(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, 8, 8);
  const data = ctx.getImageData(0, 0, 8, 8).data;
  const grays: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    grays.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  const mean = grays.reduce((a, b) => a + b, 0) / grays.length;
  return grays.map((g) => (g > mean ? "1" : "0")).join("");
}

function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

function captureFrameAsFile(video: HTMLVideoElement): Promise<File | null> {
  return new Promise((resolve) => {
    if (!video.videoWidth || !video.videoHeight) return resolve(null);
    const c = document.createElement("canvas");
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return resolve(null);
    ctx.drawImage(video, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return resolve(null);
      resolve(new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
}

function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function isMeaningfullyDifferent(prev: VolumetricScanResult, next: VolumetricScanResult): boolean {
  if (normalizeName(prev.foodName) !== normalizeName(next.foodName)) return true;
  const calDiff = Math.abs(prev.calories - next.calories) / Math.max(1, prev.calories);
  return calDiff > MEANINGFUL_CAL_DELTA;
}

function confidenceRank(c?: string): number {
  if (c === "high") return 2;
  if (c === "medium") return 1;
  return 0;
}

function tryVibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveScanner({ analyzeFrame, onConfirm, onClose }: LiveScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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

  // UI state
  const [camError, setCamError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<VolumetricScanResult | null>(null);
  const [previousResult, setPreviousResult] = useState<VolumetricScanResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stableCount, setStableCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // ─── Camera init ────────────────────────────────────────────────────────────
  useEffect(() => {
    let stream: MediaStream | null = null;
    closedRef.current = false;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    }).then((s) => {
      stream = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => logger.error("play", e));
          setReady(true);
          startTimeRef.current = performance.now();
        };
      }
    }).catch((err) => {
      logger.error("cam", err);
      setCamError("No se pudo acceder a la cámara. Revisa los permisos.");
    });
    return () => {
      closedRef.current = true;
      stream?.getTracks().forEach((t) => t.stop());
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
    if (!videoRef.current || !ready) {
      scheduleNext(SCAN_INTERVAL_MS);
      return;
    }
    if (inFlightRef.current) {
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
      // La cámara está apuntando a lo mismo: no quemamos cuota.
      scheduleNext(stableCount >= STABLE_THRESHOLD ? SCAN_INTERVAL_LOCKED_MS : SCAN_INTERVAL_STABLE_MS);
      return;
    }

    // Capturar y analizar
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
        // Cadencia adaptativa
        const next =
          stableCount >= STABLE_THRESHOLD ? SCAN_INTERVAL_LOCKED_MS :
            result ? SCAN_INTERVAL_STABLE_MS : SCAN_INTERVAL_MS;
        scheduleNext(next);
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

    const W = canvas.width;
    const H = canvas.height;
    const dpr = devicePixelRatio || 1;
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const intensify = isAnalyzing ? 1 : 0.55; // sube intensidad cuando analiza

    ctx.clearRect(0, 0, W, H);

    // ── Grid base ──
    ctx.save();
    ctx.strokeStyle = `rgba(${C_GREEN}, ${0.055 * intensify})`;
    ctx.lineWidth = 0.7;
    const step = 36 * dpr;
    for (let x = 0; x <= W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // ── Líneas topográficas (concentric contours) – ilusión de volumen ──
    {
      const cx = W / 2;
      const cy = H / 2;
      const sweep = (Math.sin(elapsed * 0.0008) + 1) * 0.5; // 0..1
      ctx.save();
      ctx.strokeStyle = `rgba(${C_GREEN}, ${0.10 * intensify})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const r = (W * 0.08) + i * (W * 0.045) + sweep * (W * 0.01);
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Sweep radial (depth scan) ──
    {
      const cx = W / 2;
      const cy = H / 2;
      const period = 2600;
      const t = (elapsed % period) / period; // 0..1
      const maxR = Math.hypot(W, H) * 0.6;
      const r1 = maxR * t;
      ctx.save();
      const grd = ctx.createRadialGradient(cx, cy, Math.max(0, r1 - 30 * dpr), cx, cy, r1 + 30 * dpr);
      grd.addColorStop(0, "transparent");
      grd.addColorStop(0.5, `rgba(${C_GREEN}, ${0.35 * intensify})`);
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, r1 + 30 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Línea horizontal de escaneo ──
    {
      const speed = isAnalyzing ? 0.0024 : 0.0009;
      const t = ((elapsed * speed) % 1);
      const y = t * H;
      const alpha = isAnalyzing ? 0.8 : 0.35;
      const grd = ctx.createLinearGradient(0, y - 55 * dpr, 0, y + 55 * dpr);
      grd.addColorStop(0, "transparent");
      grd.addColorStop(0.5, `rgba(${C_GREEN}, ${alpha})`);
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(0, y - 55 * dpr, W, 110 * dpr);
    }

    // ── Depth dots: 3 capas de profundidad ──
    if (isAnalyzing && dotsRef.current.length < 48) {
      if (Math.random() < 0.22) {
        const z = Math.random(); // profundidad
        const cx = W / 2;
        const cy = H / 2;
        const spreadX = W * (0.18 + z * 0.32);
        const spreadY = H * (0.14 + z * 0.28);
        const x = cx + (Math.random() - 0.5) * 2 * spreadX;
        const y = cy + (Math.random() - 0.5) * 2 * spreadY;
        const colorRgb =
          Math.random() < 0.55 ? C_GREEN :
            Math.random() < 0.5 ? C_BLUE :
              Math.random() < 0.5 ? C_ORANGE : C_PURPLE;
        dotsRef.current.push({
          x, y, z,
          vx: (Math.random() - 0.5) * 0.35 * dpr * (0.5 + z),
          vy: (Math.random() - 0.5) * 0.35 * dpr * (0.5 + z),
          opacity: 0,
          colorRgb,
          born: now,
        });
      }
    }

    dotsRef.current = dotsRef.current.filter((d) => {
      const age = now - d.born;
      if (age < 220) d.opacity = age / 220;
      else if (age > 2200) d.opacity = Math.max(0, d.opacity - 0.022);
      d.x += d.vx;
      d.y += d.vy;
      // Parallax: dots cercanos se mueven más con el barrido
      const drift = Math.sin(elapsed * 0.0006 + d.z * 4) * 0.15 * d.z;
      d.x += drift * dpr;
      return d.opacity > 0.005;
    });

    // Render dots por profundidad
    for (const dot of dotsRef.current) {
      const sizeBase = (1.8 + dot.z * 3) * dpr;
      const a = dot.opacity * (0.45 + dot.z * 0.55); // los cercanos brillan más
      ctx.save();
      // halo
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, sizeBase * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${dot.colorRgb}, ${a * 0.12})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // ring
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, sizeBase * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${dot.colorRgb}, ${a * 0.32})`;
      ctx.stroke();
      // core
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, sizeBase, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${dot.colorRgb}, ${a})`;
      ctx.fill();
      ctx.restore();
    }

    // Mesh entre dots cercanos en profundidad similar
    if (dotsRef.current.length > 2) {
      const dots = dotsRef.current;
      const maxDist = 150 * dpr;
      ctx.save();
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          if (Math.abs(dots[i].z - dots[j].z) > 0.35) continue; // misma capa
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const d = Math.hypot(dx, dy);
          if (d < maxDist) {
            const a =
              (1 - d / maxDist) * 0.22 *
              Math.min(dots[i].opacity, dots[j].opacity) *
              (0.4 + Math.max(dots[i].z, dots[j].z) * 0.6);
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(${C_GREEN}, ${a})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

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
    // Disparar un nuevo scan rápido
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    loopTimerRef.current = setTimeout(() => { void scanTick(); }, 400);
  }, [scanTick]);

  const isStable = stableCount >= STABLE_THRESHOLD;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Live camera */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />
      {/* Volumetric overlay */}
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
            <div className="relative w-full max-w-[330px]">
              <div className={cn(
                "absolute inset-0 blur-[60px] rounded-full transition-colors",
                isStable ? "bg-emerald-500/20" : "bg-emerald-500/10"
              )} />
              <div className="relative bg-black/55 backdrop-blur-3xl border border-white/15 rounded-[2rem] p-5 shadow-2xl overflow-hidden">
                {/* Live indicator dot top right */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {isAnalyzing && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-400/30 rounded-full px-2 py-0.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-300">LIVE</span>
                    </div>
                  )}
                  {isStable && !isAnalyzing && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/40 rounded-full px-2 py-0.5"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-emerald-300">ESTABLE</span>
                    </motion.div>
                  )}
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <div className="bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30 shrink-0">
                    <Sparkles className="h-3 w-3 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-400/80 mb-0.5">
                      Detectado en vivo
                    </p>
                    <motion.h3
                      key={result.foodName}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-base font-black text-white leading-tight truncate"
                    >
                      {result.foodName}
                    </motion.h3>
                    {previousResult && previousResult.foodName !== result.foodName && (
                      <p className="text-[9px] text-white/40 line-through truncate">
                        antes: {previousResult.foodName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: Flame, label: "kcal", value: result.calories, colorTxt: "text-orange-400", bg: "bg-orange-500/10" },
                    { icon: Beef, label: "P", value: `${result.macros.protein}g`, colorTxt: "text-red-400", bg: "bg-red-400/10" },
                    { icon: Wheat, label: "C", value: `${result.macros.carbs}g`, colorTxt: "text-amber-400", bg: "bg-amber-400/10" },
                    { icon: FatIcon, label: "G", value: `${result.macros.fat}g`, colorTxt: "text-yellow-400", bg: "bg-yellow-400/10" },
                  ].map((m, i) => (
                    <div key={i} className={cn("rounded-xl p-2 border border-white/5 text-center", m.bg)}>
                      <m.icon className={cn("h-3 w-3 mx-auto mb-1", m.colorTxt)} />
                      <p className="text-xs font-black text-white leading-none">{m.value}</p>
                      <p className="text-[8px] font-bold text-white/40 uppercase tracking-wider mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>

                {(result.aiContext?.containerType || result.aiContext?.estimatedWeightGrams) && (
                  <div className="mt-3 flex items-center justify-center gap-3 text-[9px] font-bold text-white/40 uppercase tracking-wider">
                    {result.aiContext?.estimatedWeightGrams && (
                      <span>≈ {result.aiContext.estimatedWeightGrams}g</span>
                    )}
                    {result.aiContext?.containerType && (
                      <span className="truncate max-w-[160px]">{result.aiContext.containerType}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 pb-10 px-6 z-10 flex flex-col items-center gap-3 pointer-events-auto">
        {/* Live phase pill */}
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
