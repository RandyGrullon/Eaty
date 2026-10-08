"use client";

import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

interface MealThumbProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Miniatura de comida con esqueleto mientras carga (las imágenes IA tardan) y
 * un icono de reserva si no hay foto o falla la carga.
 */
export function MealThumb({ src, alt = "", className, iconClassName }: MealThumbProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {(!showImage || !loaded) && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary to-muted",
            showImage && "animate-pulse"
          )}
        >
          <UtensilsCrossed className={cn("h-5 w-5 text-muted-foreground/50", iconClassName)} aria-hidden />
        </div>
      )}
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      ) : null}
    </div>
  );
}
