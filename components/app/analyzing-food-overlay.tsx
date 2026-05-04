"use client";

import { Loader2 } from "lucide-react";

export function AnalyzingFoodOverlay() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2
          className="mx-auto mb-4 h-12 w-12 animate-spin text-primary"
          aria-hidden
        />
        <p className="text-lg font-semibold text-primary">Analizando comida…</p>
        <p className="text-sm text-muted-foreground">
          Esto puede tomar unos segundos
        </p>
      </div>
    </div>
  );
}
