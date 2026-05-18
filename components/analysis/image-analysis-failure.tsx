"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, RefreshCw, AlertTriangle, WifiOff, Ghost } from "lucide-react";
import { motion } from "framer-motion";

type ImageAnalysisFailureProps = {
  message: string;
  imagePreviewUrl: string | null;
  onRetry: () => void;
  onDismiss: () => void;
};

export function ImageAnalysisFailure({
  message,
  imagePreviewUrl,
  onRetry,
  onDismiss,
}: ImageAnalysisFailureProps) {
  // Determinar el tipo de error para mostrar un icono diferente
  const isNetworkError = message.toLowerCase().includes("red") || message.toLowerCase().includes("conexión") || message.toLowerCase().includes("network");

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full space-y-8">
        {/* Ilustración abstracta con Iconos */}
        <div className="relative flex justify-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative h-40 w-40 flex items-center justify-center rounded-full bg-destructive/5"
          >
            <div className="absolute inset-0 animate-pulse rounded-full bg-destructive/5" />
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            >
              {isNetworkError ? (
                <WifiOff className="h-20 w-20 text-destructive/40" />
              ) : (
                <Ghost className="h-20 w-20 text-destructive/40" />
              )}
            </motion.div>
            
            <motion.div 
              initial={{ x: 20, y: 20, opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute bottom-4 right-4 h-12 w-12 flex items-center justify-center rounded-2xl bg-background border-2 border-destructive/20 shadow-xl text-destructive"
            >
              <AlertTriangle className="h-6 w-6" />
            </motion.div>
          </motion.div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            {isNetworkError ? "Sin conexión" : "¡Ups! Algo falló"}
          </h1>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed px-4">
            No pudimos analizar tu comida en este momento. Puede ser un fallo temporal de la IA o de tu conexión.
          </p>
        </div>

        {imagePreviewUrl && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden rounded-[2rem] border-border/40 bg-card/50 shadow-2xl shadow-black/[0.03] backdrop-blur-sm">
              <CardContent className="p-2">
                <div className="relative aspect-video w-full overflow-hidden rounded-[1.5rem]">
                  <img
                    src={imagePreviewUrl}
                    alt="Tu comida"
                    className="h-full w-full object-cover opacity-60 grayscale-[0.5]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Tu foto guardada</p>
                    <p className="text-xs font-bold text-white truncate">Lista para reintentar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="rounded-2xl border border-destructive/10 bg-destructive/5 p-4">
          <p className="text-xs font-semibold text-destructive/80 italic">
            &quot;{message}&quot;
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button
            type="button"
            size="lg"
            className="h-14 rounded-2xl gap-2 font-black shadow-xl shadow-primary/20"
            onClick={onRetry}
          >
            <RefreshCw className="h-5 w-5" />
            Reintentar ahora
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 rounded-xl gap-2 font-bold text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
