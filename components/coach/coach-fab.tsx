"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CoachDrawer } from "./coach-drawer";

/**
 * Botón flotante del Coach, presente en todas las pestañas principales. Tiene
 * acceso completo al estado de la DB vía `useAppData` (a través del drawer).
 */
export function CoachFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir Eaty Coach"
        className="group fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-xl shadow-primary/30 transition-transform active:scale-95 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
      >
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/30 opacity-0 group-hover:opacity-100" />
        <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
      </button>
      <CoachDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
