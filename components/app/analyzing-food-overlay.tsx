"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

const MESSAGES = [
  "Identificando alimentos…",
  "Estimando porciones…",
  "Calculando macronutrientes…",
  "Generando recomendaciones…",
  "Casi listo…",
];

export function AnalyzingFoodOverlay() {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Incremento de progreso visual: llega al 90% en ~45s de forma no lineal
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const remaining = 90 - prev;
        // Incrementa más lento a medida que se acerca al 90%
        return prev + Math.max(0.1, remaining / 100);
      });
    }, 500);

    // Rotar mensajes cada 6 segundos
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearInterval(msgInterval);
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-xs text-center">
        <Loader2
          className="mx-auto mb-6 h-12 w-12 animate-spin text-primary"
          aria-hidden
        />
        <h2 className="mb-2 text-xl font-bold text-primary">
          {MESSAGES[messageIndex]}
        </h2>
        <p className="mb-8 text-sm text-muted-foreground">
          El análisis de imágenes por IA puede tardar hasta un minuto.
        </p>
        <Progress value={progress} className="h-2 w-full" />
        <p className="mt-2 text-xs text-muted-foreground/60 italic">
          No cierres la aplicación
        </p>
      </div>
    </div>
  );
}

