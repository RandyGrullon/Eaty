"use client";

import { Button } from "@/components/ui/button";
import { Camera, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { formatMealDate } from "@/lib/date-format";
import { MealThumb } from "@/components/meal/meal-thumb";
import type { Meal } from "@/types/meal";

interface RecentMealsProps {
  loading: boolean;
  meals: Meal[];
  onSelect: (meal: Meal) => void;
  onViewHistory: () => void;
  onScan?: () => void;
}

export function RecentMeals({ loading, meals, onSelect, onViewHistory, onScan }: RecentMealsProps) {
  return (
    <section className="surface p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Últimas comidas</h2>
          <p className="text-sm text-muted-foreground">Toca una para editarla</p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 rounded-full text-primary" onClick={onViewHistory}>
          Historial
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : meals.length > 0 ? (
        <ul className="-mx-2 divide-y divide-border">
          {meals.map((meal, i) => (
            <motion.li
              key={meal.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <button
                type="button"
                onClick={() => onSelect(meal)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted/70"
              >
                <MealThumb src={meal.imageUrl} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{meal.foodName}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground tabular">
                    {formatMealDate(meal.createdAt)}
                    <span className="hidden items-center gap-1.5 sm:flex">
                      <span className="h-1.5 w-1.5 rounded-full bg-protein" />P {Math.round(meal.macros.protein)}
                      <span className="h-1.5 w-1.5 rounded-full bg-carbs" />C {Math.round(meal.macros.carbs)}
                      <span className="h-1.5 w-1.5 rounded-full bg-fat" />G {Math.round(meal.macros.fat)}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-lg font-semibold tabular leading-none">{meal.calories}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">kcal</p>
                </div>
              </button>
            </motion.li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center">
          <Camera className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 font-medium">Aún no has registrado comidas</p>
          <p className="mt-1 text-sm text-muted-foreground">Haz una foto a tu plato y Eaty calcula el resto.</p>
          {onScan ? (
            <Button onClick={onScan} className="mt-4 rounded-full">
              Registrar mi primera comida
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
