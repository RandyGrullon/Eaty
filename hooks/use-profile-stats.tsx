"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getUserMeals } from "@/lib/meals";
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
 * Carga las comidas del usuario y calcula sus estadísticas según el período
 * seleccionado. Antes esta lógica vivía dentro de ProfilePage (1233 líneas).
 */
export function useProfileStats(userId: string | undefined) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("weekly");

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setMeals(await getUserMeals(userId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) reload();
  }, [userId, reload]);

  const stats = useMemo(
    () => computeStats(meals, selectedPeriod),
    [meals, selectedPeriod]
  );

  return {
    meals,
    stats,
    loading,
    error,
    selectedPeriod,
    setSelectedPeriod,
    reload,
  };
}
