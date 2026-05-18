"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, Zap, ScanLine, Loader2, Aperture, Focus, Flame, Beef, Wheat, Droplets as FatIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";

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
          {!isInitializing && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                {/* Frame corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                
                {/* Center crosshair */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <Focus className="w-16 h-16 text-white" />
                </div>

                {/* Animated Scan Line */}
                <motion.div 
                  className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </div>
          )}

          {/* AR Floating Labels when result is ready */}
          <AnimatePresence>
            {analysisResult && !isAnalyzingRealTime && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6"
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                  <div className="relative bg-black/60 backdrop-blur-xl border border-primary/40 rounded-[2rem] p-6 shadow-2xl min-w-[280px]">
                    <div className="flex flex-col items-center text-center mb-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Detección Live</p>
                      <h3 className="text-xl font-black text-white">{analysisResult.foodName}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Calorías</span>
                        </div>
                        <p className="text-lg font-black text-white">{analysisResult.calories} <span className="text-[10px]">kcal</span></p>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                          <Beef className="h-3 w-3 text-red-400" />
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Proteína</span>
                        </div>
                        <p className="text-lg font-black text-white">{analysisResult.macros.protein}g</p>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                          <Wheat className="h-3 w-3 text-amber-400" />
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Carbos</span>
                        </div>
                        <p className="text-lg font-black text-white">{analysisResult.macros.carbs}g</p>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                          <FatIcon className="h-3 w-3 text-yellow-400" />
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Grasa</span>
                        </div>
                        <p className="text-lg font-black text-white">{analysisResult.macros.fat}g</p>
                      </div>
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
