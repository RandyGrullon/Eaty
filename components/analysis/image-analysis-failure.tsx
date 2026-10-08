"use client";

import { Button } from "@/components/ui/button";
import { Home, RefreshCw, AlertTriangle, WifiOff } from "lucide-react";
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
  const isNetworkError =
    message.toLowerCase().includes("red") ||
    message.toLowerCase().includes("conexión") ||
    message.toLowerCase().includes("network");
  const Icon = isNetworkError ? WifiOff : AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4 pb-32 pt-6 md:pb-12"
    >
      <div className="surface w-full max-w-md space-y-5 p-6 text-center sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Icon className="h-6 w-6" />
        </span>

        <div>
          <h1 className="text-2xl font-bold">{isNetworkError ? "Sin conexión" : "No pudimos analizarla"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Puede ser un fallo temporal de la IA o de tu conexión. Tu foto sigue aquí.
          </p>
        </div>

        {imagePreviewUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreviewUrl} alt="Tu comida" className="h-full w-full object-cover opacity-80" />
            <span className="absolute bottom-2 left-2 rounded-full bg-card px-2.5 py-1 text-xs font-medium">
              Lista para reintentar
            </span>
          </div>
        )}

        <p className="rounded-xl bg-destructive/10 px-3 py-2.5 text-left text-sm text-destructive">{message}</p>

        <div className="flex flex-col gap-2 pt-1">
          <Button type="button" className="h-11 rounded-full" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
          <Button type="button" variant="ghost" className="h-11 rounded-full text-muted-foreground" onClick={onDismiss}>
            <Home className="h-4 w-4" />
            Volver al inicio
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
