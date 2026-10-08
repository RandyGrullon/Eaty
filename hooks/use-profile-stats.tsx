"use client";

import { useState, useCallback, useMemo } from "react";
import { useAppData } from "@/hooks/use-app-data";
import type { Meal } from "@/types/meal";

export type TimePeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi-annual"
  | "annual";

export interface ProfileStats {
  totalMeals: number;
  totalCalories: number;
  averageCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  weeklyMeals: number;
  weeklyCalories: number;
}

export const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "daily", label: "Hoy" },
  { value: "weekly", label: "7 días" },
  { value: "monthly", label: "30 días" },
  { value: "quarterly", label: "Trim." },
  { value: "semi-annual", label: "Sem." },
  { value: "annual", label: "Año" },
];

const EMPTY_STATS: ProfileStats = {
  totalMeals: 0,
  totalCalories: 0,
  averageCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFat: 0,
  totalFiber: 0,
  totalSugar: 0,
  weeklyMeals: 0,
  weeklyCalories: 0,
};

function filterMealsByPeriod(meals: Meal[], period: TimePeriod): Meal[] {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "daily":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "weekly":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case "monthly":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "quarterly":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case "semi-annual":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 6);
      break;
    case "annual":
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return meals;
  }

  return meals.filter((meal) => meal.createdAt >= startDate);
}

function computeStats(meals: Meal[], period: TimePeriod): ProfileStats {
  const filtered = filterMealsByPeriod(meals, period);
  if (filtered.length === 0) return EMPTY_STATS;

  const sum = (fn: (m: Meal) => number) => filtered.reduce((s, m) => s + fn(m), 0);

  const totalMeals = filtered.length;
  const totalCalories = sum((m) => m.calories);

  return {
    totalMeals,
    totalCalories,
    averageCalories: Math.round(totalCalories / totalMeals),
    totalProtein: sum((m) => m.macros.protein),
    totalCarbs: sum((m) => m.macros.carbs),
    totalFat: sum((m) => m.macros.fat),
    totalFiber: sum((m) => m.macros.fiber),
    totalSugar: sum((m) => m.macros.sugar),
    weeklyMeals: totalMeals,
    weeklyCalories: totalCalories,
  };
}

/**
 * Calcula las estadísticas del usuario según el período seleccionado a partir de
 * las comidas en tiempo real del store global (`useAppData`). Las comidas
 * planificadas (`isPlanned`) no cuentan como consumidas.
 */
export function useProfileStats(userId: string | undefined) {
  const { meals: allMeals, loading: appLoading, refresh } = useAppData();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("weekly");

  const meals = useMemo(
    () => (userId ? allMeals.filter((m) => !m.isPlanned) : []),
    [allMeals, userId]
  );

  const stats = useMemo(
    () => computeStats(meals, selectedPeriod),
    [meals, selectedPeriod]
  );

  // Los datos llegan en tiempo real; `reload` se mantiene por compatibilidad.
  const reload = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return {
    meals,
    stats,
    loading: Boolean(userId) && appLoading,
    error: null as string | null,
    selectedPeriod,
    setSelectedPeriod,
    reload,
  };
}
