"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  /** Texto pequeño bajo el título (mayúsculas, tracking ancho). */
  subtitle?: string;
  /** Elemento a la izquierda del título (p. ej. botón "volver"). */
  leading?: ReactNode;
  /** Badge junto al subtítulo. */
  badge?: ReactNode;
  /** Acciones a la derecha (botones). */
  actions?: ReactNode;
  /** Contenido extra bajo la cabecera (p. ej. la tira semanal del planificador). */
  children?: ReactNode;
  className?: string;
}

/**
 * Cabecera de página consistente: hero con degradado, título, subtítulo y
 * acciones. Unifica el lenguaje visual del inicio en el resto de páginas.
 */
export function PageHeader({
  title,
  subtitle,
  leading,
  badge,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <section className={cn("relative overflow-hidden", className)}>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl opacity-50"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-10 pb-8 sm:px-8">
        <div className="flex items-center gap-4">
          {leading}
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {(subtitle || badge) && (
              <div className="mt-1 flex items-center gap-2">
                {badge}
                {subtitle && (
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}
