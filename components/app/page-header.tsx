"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  /** Texto breve bajo el título. */
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

/** Cabecera de página consistente: título, subtítulo y acciones. */
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
    <header className={cn("mx-auto max-w-6xl px-4 pb-2 pt-6 sm:px-6 lg:px-10 lg:pt-10", className)}>
      <div className="flex items-center gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
          {(subtitle || badge) && (
            <div className="mt-1 flex items-center gap-2">
              {badge}
              {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
