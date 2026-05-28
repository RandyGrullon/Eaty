"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Zap, Aperture, Flame, Beef, Wheat, Droplets as FatIcon, Sparkles, ScanLine, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface LiveScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  isAnalyzingRealTime?: boolean;
  analysisResult?: any;
}

type ScanPhase = "idle" | "capturing" | "done";

interface Dot {
  x: number;
  y: number;
  opacity: number;
  r: number;
  vx: number;
  vy: number;
  colorRgb: string;
  born: number;
}

// Emerald accent RGB
const C_GREEN = "52, 211, 153";
const C_BLUE = "96, 165, 250";
const C_ORANGE = "251, 146, 60";

const CAPTURE_PHASES = [
  "Detectando componentes...",
  "Mapeando proporciones visuales...",
  "Calibrando densidad calórica...",
  "Sintetizando perfil nutricional...",
];

export function LiveScanner({ onCapture, onClose, isAnalyzingRealTime, analysisResult }: LiveScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<ScanPhase>("idle");
  const dotsRef = useRef<Dot[]>([]);
  const startTimeRef = useRef<number>(performance.now());

  const [camError, setCamError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Camera init
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    }).then(s => {
      stream = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => logger.error("play", e));
          setReady(true);
          startTimeRef.current = performance.now();
        };
      }
    }).catch(err => {
      logger.error("cam", err);
      setCamError("No se pudo acceder a la cámara. Revisa los permisos.");
    });
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Canvas sizing via ResizeObserver
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

  // Canvas animation loop
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
    const currentPhase = phaseRef.current;

    ctx.clearRect(0, 0, W, H);

    if (currentPhase === "done") {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    // --- Grid ---
    const gridAlpha = currentPhase === "capturing" ? 0.10 : 0.045;
    ctx.save();
    ctx.strokeStyle = `rgba(${C_GREEN}, ${gridAlpha})`;
    ctx.lineWidth = 0.7;
    const step = 36 * dpr;
    for (let x = 0; x <= W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // --- Primary scan line ---
    {
      const speed = currentPhase === "capturing" ? 0.0025 : 0.0010;
      const t = ((elapsed * speed) % 1);
      const y = t * H;
      const alpha = currentPhase === "capturing" ? 0.85 : 0.40;
      const grd = ctx.createLinearGradient(0, y - 55 * dpr, 0, y + 55 * dpr);
      grd.addColorStop(0, "transparent");
      grd.addColorStop(0.35, `rgba(${C_GREEN}, ${alpha * 0.25})`);
      grd.addColorStop(0.5, `rgba(${C_GREEN}, ${alpha})`);
      grd.addColorStop(0.65, `rgba(${C_GREEN}, ${alpha * 0.25})`);
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(0, y - 55 * dpr, W, 110 * dpr);
    }

    // --- Second scan line (opposing direction, only during capture) ---
    if (currentPhase === "capturing") {
      const speed2 = 0.0018;
      const t2 = 1 - ((elapsed * speed2 + 0.5) % 1);
      const y2 = t2 * H;
      const grd2 = ctx.createLinearGradient(0, y2 - 35 * dpr, 0, y2 + 35 * dpr);
      grd2.addColorStop(0, "transparent");
      grd2.addColorStop(0.5, `rgba(${C_BLUE}, 0.55)`);
      grd2.addColorStop(1, "transparent");
      ctx.fillStyle = grd2;
      ctx.fillRect(0, y2 - 35 * dpr, W, 70 * dpr);
    }

    // --- Plate detection oval (idle only) ---
    if (currentPhase === "idle") {
      const cx = W / 2;
      const cy = H / 2;
      const rx = W * 0.30;
      const ry = H * 0.27;
      const pulse = 0.45 + 0.35 * Math.sin(elapsed * 0.0018);

      ctx.save();
      ctx.strokeStyle = `rgba(${C_GREEN}, ${pulse})`;
      ctx.lineWidth = 1.5 * dpr;
      ctx.setLineDash([14 * dpr, 7 * dpr]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label above oval
      ctx.fillStyle = `rgba(${C_GREEN}, ${pulse * 1.1})`;
      ctx.font = `bold ${10 * dpr}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("ZONA DE DETECCIÓN", cx, cy - ry - 10 * dpr);

      // Cross markers at N/S/E/W of oval
      const markerLen = 8 * dpr;
      const markers = [
        [cx, cy - ry], [cx, cy + ry],
        [cx - rx, cy], [cx + rx, cy],
      ];
      ctx.strokeStyle = `rgba(${C_GREEN}, ${pulse * 1.2})`;
      ctx.lineWidth = 1.5 * dpr;
      for (const [mx, my] of markers) {
        ctx.beginPath(); ctx.moveTo(mx - markerLen, my); ctx.lineTo(mx + markerLen, my); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, my - markerLen); ctx.lineTo(mx, my + markerLen); ctx.stroke();
      }
      ctx.restore();
    }

    // --- Detection dots (spawn during capturing) ---
    if (currentPhase === "capturing") {
      const spawnChance = 0.18;
      if (Math.random() < spawnChance && dotsRef.current.length < 45) {
        // Bias spawning toward the center of the frame
        const bx = 0.2 + Math.random() * 0.6;
        const by = 0.15 + Math.random() * 0.7;
        const colorRgb = Math.random() < 0.7 ? C_GREEN : Math.random() < 0.5 ? C_BLUE : C_ORANGE;
        dotsRef.current.push({
          x: bx * W,
          y: by * H,
          opacity: 0,
          r: (1.8 + Math.random() * 3.5) * dpr,
          vx: (Math.random() - 0.5) * 0.25 * dpr,
          vy: (Math.random() - 0.5) * 0.25 * dpr,
          colorRgb,
          born: now,
        });
      }
    }

    // Fade out dots when not capturing
    if (currentPhase !== "capturing") {
      for (const d of dotsRef.current) d.opacity = Math.max(0, d.opacity - 0.04);
    }

    dotsRef.current = dotsRef.current.filter(d => d.opacity > 0.005 || now - d.born < 100);

    for (const dot of dotsRef.current) {
      const age = now - dot.born;
      if (age < 250) {
        dot.opacity = age / 250;
      } else if (age > 2200) {
        dot.opacity = Math.max(0, dot.opacity - 0.025);
      }

      dot.x += dot.vx;
      dot.y += dot.vy;

      const { x, y, r, opacity, colorRgb } = dot;

      // Outer glow ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r * 5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${colorRgb}, ${opacity * 0.12})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Middle ring
      ctx.beginPath();
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${colorRgb}, ${opacity * 0.35})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Core dot
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colorRgb}, ${opacity})`;
      ctx.fill();
      ctx.restore();
    }

    // --- Mesh between nearby dots ---
    if (dotsRef.current.length > 2) {
      const dots = dotsRef.current;
      const maxDist = 130 * dpr;
      ctx.save();
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.22 * Math.min(dots[i].opacity, dots[j].opacity);
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(${C_GREEN}, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (ready) rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ready, animate]);

  // Capture
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !captureCanvasRef.current || !ready) return;

    setPhase("capturing");
    setPhaseIdx(0);
    dotsRef.current = [];

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx < CAPTURE_PHASES.length) {
        setPhaseIdx(idx);
      } else {
        clearInterval(interval);
        const video = videoRef.current!;
        const canvas = captureCanvasRef.current!;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
            setPhase("done");
            onCapture(file);
          } else {
            setCamError("Error al capturar la imagen.");
            setPhase("idle");
          }
        }, "image/jpeg", 0.92);
      }
    }, 1000);
  }, [ready, onCapture]);

  const progressPct = phase === "capturing" ? Math.round(((phaseIdx + 1) / CAPTURE_PHASES.length) * 100) : 100;

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Live camera feed — always fills the screen */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />

      {/* AR canvas overlay — drawn on top of video, screen blend */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: "screen" }}
      />

      {/* Hidden capture canvas */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* UI overlay */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 pt-12 pb-3 pointer-events-auto">
          <div className="rounded-full bg-black/55 backdrop-blur-md px-4 py-2 border border-white/10">
            <p className="text-white text-[11px] font-black flex items-center gap-2 uppercase tracking-[0.2em]">
              <Zap className="h-3 w-3 text-emerald-400" />
              Live AR Scan
            </p>
          </div>
          <Button
            variant="ghost" size="icon"
            onClick={onClose}
            className="rounded-full bg-black/55 text-white hover:bg-black/75 border border-white/10 backdrop-blur-md"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Corner reticles (CSS, synced with the canvas oval) */}
        {!camError && phase === "idle" && ready && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="relative"
              style={{ width: "72vmin", height: "64vmin" }}
              animate={{ scale: [1, 1.015, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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

              {/* Portion size dots */}
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-2.5 items-center">
                <span className="text-[9px] text-white/35 font-bold uppercase tracking-wider">Porción</span>
                {["S", "M", "L"].map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border transition-all",
                      i === 1
                        ? "border-emerald-400 text-emerald-400 bg-emerald-400/15 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                        : "border-white/20 text-white/25"
                    )}
                  >
                    {s}
                  </div>
                ))}
              </div>

              <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/45 tracking-widest uppercase whitespace-nowrap">
                Centra el plato dentro del marco
              </p>
            </motion.div>
          </div>
        )}

        {/* During capture — scanning overlay ring */}
        {phase === "capturing" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="rounded-full border-2 border-emerald-400/40"
              style={{ width: "72vmin", height: "64vmin" }}
              animate={{ scale: [1, 1.04, 0.97, 1.02, 1], opacity: [1, 0.6, 1, 0.7, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        )}

        {/* Analysis result overlay */}
        <AnimatePresence>
          {analysisResult && !isAnalyzingRealTime && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none px-6"
            >
              <div className="relative w-full max-w-[290px]">
                <div className="absolute inset-0 bg-emerald-500/15 blur-[70px] rounded-full" />
                <div className="relative bg-black/55 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] p-7 shadow-2xl overflow-hidden">
                  <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-white/7 via-transparent to-transparent rotate-12 pointer-events-none" />

                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="bg-emerald-500/20 p-2 rounded-xl mb-2 border border-emerald-500/30">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-emerald-400/80 mb-1">Análisis IA</p>
                    <h3 className="text-xl font-black text-white leading-tight">{analysisResult.foodName}</h3>
                    {analysisResult.portionHypothesis && (
                      <div className="mt-2">
                        <span className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                          analysisResult.portionHypothesis.relativeSize === "small"
                            ? "border-blue-400/40 text-blue-400 bg-blue-400/10"
                            : analysisResult.portionHypothesis.relativeSize === "large"
                              ? "border-orange-400/40 text-orange-400 bg-orange-400/10"
                              : "border-emerald-400/40 text-emerald-400 bg-emerald-400/10"
                        )}>
                          Porción {analysisResult.portionHypothesis.relativeSize === "small" ? "Pequeña"
                            : analysisResult.portionHypothesis.relativeSize === "large" ? "Grande" : "Media"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Flame, label: "Calorías", value: `${analysisResult.calories}`, unit: "kcal", colorTxt: "text-orange-400", bg: "bg-orange-500/10" },
                      { icon: Beef, label: "Proteína", value: `${analysisResult.macros.protein}`, unit: "g", colorTxt: "text-red-400", bg: "bg-red-400/10" },
                      { icon: Wheat, label: "Carbos", value: `${analysisResult.macros.carbs}`, unit: "g", colorTxt: "text-amber-400", bg: "bg-amber-400/10" },
                      { icon: FatIcon, label: "Grasa", value: `${analysisResult.macros.fat}`, unit: "g", colorTxt: "text-yellow-400", bg: "bg-yellow-400/10" },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={cn("rounded-2xl p-3.5 border border-white/5", item.bg)}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <item.icon className={cn("h-3 w-3 shrink-0", item.colorTxt)} />
                          <span className="text-[8px] font-black uppercase text-white/40 tracking-wider truncate">{item.label}</span>
                        </div>
                        <p className="text-[15px] font-black text-white leading-none">
                          {item.value}
                          <span className="text-[9px] text-white/45 ml-0.5">{item.unit}</span>
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] font-bold text-white/22 uppercase tracking-[0.2em]">
                    <ScanLine className="h-2.5 w-2.5" />
                    Visión por Computadora
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom controls */}
        <div className="mt-auto flex flex-col items-center pb-14 gap-5 pointer-events-auto">
          <AnimatePresence mode="wait">
            {phase === "capturing" || isAnalyzingRealTime ? (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                className="flex flex-col items-center gap-4 w-full max-w-[300px] px-6"
              >
                {/* Spinner */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-400/15 blur-lg animate-pulse" />
                  <div className="relative w-12 h-12 rounded-full border-2 border-emerald-400/30 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-[2.5px] border-emerald-400 border-t-transparent animate-spin" />
                  </div>
                </div>

                {/* Phase card */}
                <div className="w-full bg-black/70 backdrop-blur-xl border border-emerald-400/25 rounded-2xl px-5 py-4">
                  <p className="text-emerald-400 font-black text-[11px] uppercase tracking-widest mb-2 text-center">
                    {isAnalyzingRealTime ? "Analizando con IA..." : CAPTURE_PHASES[phaseIdx]}
                  </p>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                      animate={{ width: `${isAnalyzingRealTime ? 80 : progressPct}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>

            ) : analysisResult ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 w-full max-w-sm px-6"
              >
                <Button
                  variant="outline"
                  className="flex-1 rounded-2xl h-14 font-black border-white/20 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => onCapture(new File([], "reset"))}
                >
                  Reintentar
                </Button>
                <Button
                  className="flex-[2] rounded-2xl h-14 font-black bg-emerald-500 hover:bg-emerald-400 text-black shadow-xl shadow-emerald-500/25"
                  onClick={() => onCapture(new File([], "confirm"))}
                >
                  Confirmar
                </Button>
              </motion.div>

            ) : (
              <motion.div
                key="capture"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5"
              >
                {/* Shutter button */}
                <button
                  onClick={handleCapture}
                  disabled={!ready || !!camError}
                  className="relative flex items-center justify-center w-[76px] h-[76px] rounded-full transition-transform hover:scale-105 active:scale-90 disabled:opacity-40 group"
                >
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-[3px] border-white/70 backdrop-blur-sm" />
                  {/* Glow */}
                  <div className="absolute inset-1 rounded-full bg-emerald-400/15 blur-md group-hover:bg-emerald-400/25 transition-all" />
                  {/* Inner circle */}
                  <div className="relative w-[58px] h-[58px] rounded-full bg-white flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.35)]">
                    <Aperture className="h-7 w-7 text-black" />
                  </div>
                </button>

                <p className="text-white/45 text-[11px] font-medium tracking-wide">
                  Toca para analizar con IA
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Initializing overlay */}
      {!ready && !camError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black gap-4">
          <div className="w-12 h-12 rounded-full border-[2.5px] border-emerald-400 border-t-transparent animate-spin" />
          <p className="text-emerald-400/80 text-sm font-black tracking-widest uppercase">
            Activando Cámara...
          </p>
        </div>
      )}

      {/* Error overlay */}
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
