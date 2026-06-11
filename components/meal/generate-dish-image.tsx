"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCcw, ImageIcon, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateDishImageUrl,
  isDishImageConfigured,
  type DishImageContext,
} from "@/lib/dish-image";

interface GenerateDishImageProps {
  meal: DishImageContext;
  /** Si se provee, muestra "Usar como foto" para persistir la imagen generada. */
  onUseImage?: (url: string) => void | Promise<void>;
  className?: string;
}

/**
 * Botón + previsualización para generar una imagen del plato con IA (Pollinations,
 * gratis y sin API key) a partir del contexto del plato. Opcionalmente permite
 * usar la imagen generada como foto de la comida.
 */
export function GenerateDishImage({ meal, onUseImage, className }: GenerateDishImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [used, setUsed] = useState(false);

  const generate = () => {
    setLoaded(false);
    setError(false);
    setUsed(false);
    setUrl(generateDishImageUrl(meal));
  };

  const handleUse = async () => {
    if (!url || !onUseImage) return;
    setSaving(true);
    try {
      await onUseImage(url);
      setUsed(true);
    } finally {
      setSaving(false);
    }
  };

  if (!url) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={generate}
        className={cn("gap-2 rounded-2xl font-bold", className)}
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Generar imagen con IA
      </Button>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-muted aspect-square">
        {!loaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest">Generando plato…</p>
          </div>
        )}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-xs font-medium">
              {isDishImageConfigured()
                ? "No se pudo generar la imagen. Inténtalo de nuevo."
                : "Generación de imágenes no disponible. Configura una clave de Pollinations (NEXT_PUBLIC_POLLINATIONS_TOKEN)."}
            </p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`Imagen generada de ${meal.foodName}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-500",
              loaded ? "opacity-100" : "opacity-0"
            )}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={!loaded && !error}
          className="gap-2 rounded-xl font-bold"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          Regenerar
        </Button>
        {onUseImage && (
          <Button
            type="button"
            size="sm"
            onClick={handleUse}
            disabled={!loaded || saving || used}
            className="gap-2 rounded-xl font-bold"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : used ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            {used ? "Foto actualizada" : "Usar como foto"}
          </Button>
        )}
      </div>
    </div>
  );
}
