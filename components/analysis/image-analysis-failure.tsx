"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-destructive/10 border-b border-destructive/20 p-4">
        <div className="max-w-lg mx-auto flex items-start gap-3">
          <AlertCircle
            className="h-6 w-6 text-destructive shrink-0 mt-0.5"
            aria-hidden
          />
          <div>
            <h1 className="text-lg font-bold text-foreground">
              No se pudo analizar la imagen
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Puede ser un fallo temporal, la conexión o un formato de imagen. Puedes
              volver a intentar con el mismo plato o volver y elegir otra foto.
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        {imagePreviewUrl ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tu foto</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={imagePreviewUrl}
                alt="Vista previa del plato"
                className="w-full rounded-lg object-cover max-h-64 border border-border"
              />
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-foreground/90 leading-relaxed">{message}</p>
          </CardContent>
        </Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            className="flex-1 gap-2"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar análisis
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            onClick={onDismiss}
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
