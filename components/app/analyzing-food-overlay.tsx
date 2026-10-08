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
      <div className="surface w-full max-w-sm p-6 text-center sm:p-8" role="status" aria-live="polite">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        </span>
        <h2 className="mt-5 text-xl font-semibold">{MESSAGES[messageIndex]}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">El análisis por IA puede tardar hasta un minuto.</p>
        <Progress value={progress} className="mt-6 h-2 w-full" />
        <p className="mt-2 text-xs text-muted-foreground tabular">
          {Math.round(progress)}% · No cierres la aplicación
        </p>
      </div>
    </div>
  );
}
