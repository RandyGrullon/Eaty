"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCcw, ImageIcon, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateDishImageUrl, type DishImageContext } from "@/lib/dish-image";

interface GenerateDishImageProps {
  meal: DishImageContext;
  /** Si se provee, muestra "Usar como foto" para persistir la imagen generada. */
  onUseImage?: (url: string) => void | Promise<void>;
  className?: string;
}

/** Reintentos automáticos en el cliente si el proxy responde "saturado". */
const MAX_CLIENT_RETRIES = 2;

/**
 * Genera una imagen del plato con IA (vía `/api/dish-image`, que encola y reintenta
 * contra Pollinations) a partir del contexto del plato. Opcionalmente permite usar
 * la imagen generada como foto de la comida.
 */
export function GenerateDishImage({ meal, onUseImage, className }: GenerateDishImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [used, setUsed] = useState(false);

  const generate = () => {
    setLoaded(false);
    setError(false);
    setUsed(false);
    setAttempt(0);
    setUrl(generateDishImageUrl(meal));
  };

  const handleError = () => {
    if (attempt < MAX_CLIENT_RETRIES && url) {
      // Misma imagen (mismo prompt/semilla); el parámetro solo evita la caché de error.
      const next = attempt + 1;
      setAttempt(next);
      setUrl(`${url.replace(/&r=\d+$/, "")}&r=${next}`);
      return;
    }
    setError(true);
  };

  const handleUse = async () => {
    if (!url || !onUseImage) return;
    setSaving(true);
    try {
      await onUseImage(url.replace(/&r=\d+$/, ""));
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
        className={cn("gap-2 rounded-full font-semibold", className)}
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Generar imagen con IA
      </Button>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-muted">
        {!loaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/10 via-transparent to-accent/40" />
            <Loader2 className="relative h-8 w-8 animate-spin text-primary" />
            <p className="relative text-xs font-semibold">
              {attempt === 0 ? "Generando el plato…" : "El generador está ocupado, reintentando…"}
            </p>
            <p className="relative text-[11px] opacity-70">Puede tardar hasta un minuto</p>
          </div>
        )}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium">El generador de imágenes está saturado.</p>
            <p className="text-xs">Pulsa “Regenerar” para intentarlo otra vez.</p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={`Imagen generada de ${meal.foodName}`}
            onLoad={() => setLoaded(true)}
            onError={handleError}
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
          className="gap-2 rounded-full font-semibold"
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
            className="gap-2 rounded-full font-semibold"
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
