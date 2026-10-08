"use client";

import { AnimatePresence } from "framer-motion";
import { MealHistoryCard } from "./meal-history-card";
import type { Meal } from "@/types/meal";

interface MealTimelineGroupProps {
  dateString: string;
  dayMeals: Meal[];
  onSelect: (meal: Meal) => void;
}

export function MealTimelineGroup({ dateString, dayMeals, onSelect }: MealTimelineGroupProps) {
  const date = new Date(dateString);
  const dayCalories = dayMeals.reduce((s, m) => s + m.calories, 0);

  return (
    <section className="relative">
      <div className="sticky top-0 z-20 -mx-4 mb-3 flex items-center justify-between gap-3 bg-background/95 px-4 py-2 sm:mx-0 sm:px-0">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-muted/60">
            <span className="text-[11px] font-medium capitalize leading-none text-primary">
              {date.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}
            </span>
            <span className="mt-0.5 font-display text-lg font-bold leading-none tabular">{date.getDate()}</span>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold capitalize">
              {date.toLocaleDateString("es-ES", { weekday: "long" })}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Total del día</p>
          <p className="font-display text-lg font-semibold leading-none tabular text-primary">
            {dayCalories} <span className="text-xs font-normal text-muted-foreground">kcal</span>
          </p>
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {dayMeals.map((meal) => (
            <MealHistoryCard key={meal.id} meal={meal} onSelect={onSelect} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
