"use client";

import { useState } from "react";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { isDemoMode } from "@/lib/demo/mode";

/** Aviso discreto en modo demo: los datos son de ejemplo y viven en este navegador. */
export function DemoBanner() {
  const [hidden, setHidden] = useState(false);
  if (!isDemoMode() || hidden) return null;

  const reset = async () => {
    const { demoStore } = await import("@/lib/demo/store");
    demoStore.reset();
  };

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-accent/70 px-4 py-2 text-xs text-accent-foreground backdrop-blur">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <p className="min-w-0 flex-1 truncate">
        Modo demo: datos de ejemplo guardados solo en este navegador.
      </p>
      <button type="button" onClick={reset} className="flex items-center gap-1 rounded-full px-2 py-0.5 font-medium hover:bg-background/40">
        <RotateCcw className="h-3 w-3" /> Reiniciar
      </button>
      <button type="button" onClick={() => setHidden(true)} aria-label="Ocultar aviso" className="rounded-full p-1 hover:bg-background/40">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
