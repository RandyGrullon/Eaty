"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CoachDrawer } from "./coach-drawer";

/**
 * Botón flotante del Coach, presente en todas las pestañas principales. Tiene
 * acceso completo al estado de la DB vía `useAppData` (a través del drawer).
 * En móvil queda por encima de la barra inferior (≈68 px + 12 px de margen).
 */
export function CoachFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir Eaty Coach"
        className="fixed bottom-28 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:bg-primary/90 active:scale-95 md:bottom-8 md:right-8"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <CoachDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
