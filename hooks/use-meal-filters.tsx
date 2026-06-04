"use client";

import { useState, useMemo } from "react";
import type { Meal } from "@/types/meal";

export type FilterPeriod = "day" | "week" | "month" | "all";
export type CalorieRange = "all" | "low" | "mid" | "high";

function periodStartDate(period: FilterPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case "day": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "all":
    default:
      return null;
  }
}

function matchesCalorieRange(calories: number, range: CalorieRange): boolean {
  switch (range) {
    case "low":
      return calories < 200;
    case "mid":
      return calories >= 200 && calories < 500;
    case "high":
      return calories >= 500;
    case "all":
    default:
      return true;
  }
}

/** Texto sobre el que busca el buscador: nombre + recomendaciones + contexto IA. */
function searchableText(meal: Meal): string {
  const parts: string[] = [meal.foodName, ...(meal.recommendations ?? [])];
  const ai = meal.aiContext;
  if (ai) {
    if (ai.portionLabel) parts.push(ai.portionLabel);
    if (ai.containerType) parts.push(ai.containerType);
    if (ai.componentBreakdown) {
      for (const c of ai.componentBreakdown) if (c?.name) parts.push(c.name);
    }
  }
  return parts.join(" ").toLowerCase();
}

export interface MealFilters {
  period: FilterPeriod;
  query: string;
  calorieRange: CalorieRange;
}

/** Función pura de filtrado (testeable de forma aislada). */
export function filterMeals(meals: Meal[], filters: MealFilters): Meal[] {
  const start = periodStartDate(filters.period);
  const q = filters.query.trim().toLowerCase();

  return meals.filter((meal) => {
    if (start && meal.createdAt < start) return false;
    if (q && !searchableText(meal).includes(q)) return false;
    if (!matchesCalorieRange(meal.calories, filters.calorieRange)) return false;
    return true;
  });
}

/** Estado de filtros del historial + lista filtrada derivada. */
export function useMealFilters(meals: Meal[]) {
  const [period, setPeriod] = useState<FilterPeriod>("week");
  const [query, setQuery] = useState("");
  const [calorieRange, setCalorieRange] = useState<CalorieRange>("all");

  const filteredMeals = useMemo(
    () => filterMeals(meals, { period, query, calorieRange }),
    [meals, period, query, calorieRange]
  );

  return {
    period,
    setPeriod,
    query,
    setQuery,
    calorieRange,
    setCalorieRange,
    filteredMeals,
  };
}
