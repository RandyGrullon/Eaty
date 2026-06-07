"use client";

import { useCallback } from "react";
import type { KeyedMutator } from "swr";
import { useAppData, type CalorieData } from "@/hooks/use-app-data";

export type { CalorieData };

/**
 * Adaptador estable sobre el store global (`useAppData`). Mantiene la API previa
 * (`calorieData`, `loading`, `error`, `refreshData`, `mutate`) pero ahora los
 * datos se derivan en tiempo real del perfil + comidas de hoy. `mutate` se deja
 * como no-op tolerante: las actualizaciones llegan solas por onSnapshot.
 */
export function useCalorieTracker() {
  const { calorieData, loading, refresh } = useAppData();

  const mutate = useCallback(
    async () => calorieData ?? undefined,
    [calorieData]
  ) as unknown as KeyedMutator<CalorieData>;

  return {
    calorieData: calorieData ?? null,
    loading,
    error: null as string | null,
    refreshData: refresh,
    mutate,
  };
}
