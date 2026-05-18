"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, Zap, ScanLine, Loader2, Aperture, Focus, Flame, Beef, Wheat, Droplets as FatIcon, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface LiveScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  isAnalyzingRealTime?: boolean;
  analysisResult?: any;
}

export function LiveScanner({ onCapture, onClose, isAnalyzingRealTime, analysisResult }: LiveScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState(0);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => logger.error("Video play error", e));
          setIsInitializing(false);
        };
      }
    } catch (err) {
      logger.error("Camera access error", err);
      setError("No se pudo acceder a la cámara. Revisa los permisos.");
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Start AR "processing" animation
    setIsAnalyzing(true);
    
    const phases = [
      "Mapeando topología 3D del plato...",
      "Identificando ingredientes...",
      "Calculando volumen y densidad calórica...",
      "Sintetizando perfil nutricional..."
    ];
    
    let currentPhase = 0;
    const phaseInterval = setInterval(() => {
      currentPhase++;
      if (currentPhase < phases.length) {
        setAnalysisPhase(currentPhase);
      } else {
        clearInterval(phaseInterval);
        
        // Finalize capture and pass file
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
            stopCamera();
            onCapture(file);
          } else {
            setError("Error al capturar la imagen.");
            setIsAnalyzing(false);
          }
        }, 'image/jpeg', 0.9);
      }
    }, 1200); // Wait 1.2s per phase for the "live analysis" effect

  }, [onCapture]);

  const phasesText = [
    "Mapeando topología 3D del plato...",
    "Identificando ingredientes...",
    "Calculando volumen y densidad calórica...",
    "Sintetizando perfil nutricional..."
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden">
      {/* Viewfinder */}
      <div className="relative flex-1 w-full bg-black">
        <video 
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* UI Overlays */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none">
          {/* Header */}
          <div className="flex items-center justify-between z-10 pointer-events-auto">
            <div className="rounded-full bg-black/50 backdrop-blur-md px-4 py-2 border border-white/10">
              <p className="text-white text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                <Zap className="h-3 w-3 text-primary" />
                Live AR Scan
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/10 backdrop-blur-md">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* AR Scanner Reticle Overlay */}
          {!isInitializing && !error && !analysisResult && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-72 h-72 sm:w-80 sm:h-80">
                {/* Frame corners */}
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0"
                >
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-3xl shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-3xl shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-3xl shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-3xl shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                </motion.div>
                
                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Focus className="w-20 h-20 text-white/40" />
                  </motion.div>
                </div>

                {/* Pulsing detected points */}
                <div className="absolute top-1/4 left-1/4 h-2 w-2 bg-primary rounded-full animate-ping" />
                <div className="absolute top-1/3 right-1/4 h-2 w-2 bg-chart-2 rounded-full animate-ping [animation-delay:0.5s]" />
                <div className="absolute bottom-1/4 left-1/3 h-2 w-2 bg-chart-1 rounded-full animate-ping [animation-delay:1s]" />

                {/* Animated Scan Line */}
                <motion.div 
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_rgba(var(--primary),1)]"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          )}

          {/* AR Floating Labels when result is ready */}
          <AnimatePresence>
            {analysisResult && !isAnalyzingRealTime && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6"
              >
                <div className="relative w-full max-w-[320px]">
                  <div className="absolute inset-0 bg-primary/30 blur-[100px] rounded-full animate-pulse" />
                  <div className="relative bg-black/40 backdrop-blur-3xl border border-white/20 rounded-[3rem] p-8 shadow-2xl overflow-hidden">
                    {/* Glass glare effect */}
                    <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-12 pointer-events-none" />
                    
                    <div className="flex flex-col items-center text-center mb-8">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-primary/20 p-2 rounded-xl mb-3 border border-primary/30"
                      >
                        <Sparkles className="h-5 w-5 text-primary" />
                      </motion.div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80 mb-2">Análisis Finalizado</p>
                      <h3 className="text-2xl font-black text-white leading-tight">{analysisResult.foodName}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { icon: Flame, label: "Calorías", value: `${analysisResult.calories} kcal`, color: "text-orange-500", bg: "bg-orange-500/10" },
                        { icon: Beef, label: "Proteína", value: `${analysisResult.macros.protein}g`, color: "text-red-400", bg: "bg-red-400/10" },
                        { icon: Wheat, label: "Carbos", value: `${analysisResult.macros.carbs}g`, color: "text-amber-400", bg: "bg-amber-400/10" },
                        { icon: FatIcon, label: "Grasa", value: `${analysisResult.macros.fat}g`, color: "text-yellow-400", bg: "bg-yellow-400/10" }
                      ].map((item, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn("rounded-2xl p-4 border border-white/5", item.bg)}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                            <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">{item.label}</span>
                          </div>
                          <p className="text-lg font-black text-white">{item.value}</p>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">
                      <ScanLine className="h-3 w-3" />
                      Visión por Computadora
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Controls */}
          <div className="flex flex-col items-center justify-end pb-8 gap-6 z-10 pointer-events-auto">
            <AnimatePresence mode="wait">
              {isAnalyzing || isAnalyzingRealTime ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex flex-col items-center gap-3"
                >
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <div className="bg-black/70 backdrop-blur-md border border-primary/30 rounded-xl px-5 py-3 text-center min-w-[280px]">
                    <p className="text-primary font-black text-sm uppercase tracking-widest mb-1">Analizando Malla</p>
                    <p className="text-white text-xs font-medium">{isAnalyzingRealTime ? "Sintetizando datos de visión..." : phasesText[analysisPhase]}</p>
                  </div>
                </motion.div>
              ) : analysisResult ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 w-full max-w-sm px-6"
                >
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-2xl h-14 font-black border-white/20 bg-white/10 text-white"
                    onClick={() => {
                      onCapture(new File([], "reset")); 
                    }}
                  >
                    Reintentar
                  </Button>
                  <Button 
                    className="flex-[2] rounded-2xl h-14 font-black shadow-xl shadow-primary/20"
                    onClick={() => {
                      onCapture(new File([], "confirm")); 
                    }}
                  >
                    Confirmar Datos
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <p className="text-white/80 text-xs font-medium mb-6 bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-sm">
                    Encuadra tu plato y presiona para analizar
                  </p>
                  <button 
                    onClick={handleCapture}
                    disabled={isInitializing || !!error}
                    className="relative flex items-center justify-center w-20 h-20 rounded-full bg-white/20 border-4 border-white backdrop-blur-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                      <Aperture className="h-8 w-8 text-black" />
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Loading / Error Overlays */}
        {isInitializing && !error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black gap-4 text-white">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium text-sm tracking-widest uppercase">Activando Cámara 3D...</p>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-6 text-center text-white">
            <div className="h-16 w-16 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mb-4">
              <Camera className="h-8 w-8" />
            </div>
            <p className="font-bold text-lg mb-2">Cámara no disponible</p>
            <p className="text-sm text-white/60 mb-6">{error}</p>
            <Button onClick={onClose} variant="outline" className="rounded-xl bg-white/10 border-white/20 hover:bg-white/20">
              Volver atrás
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
