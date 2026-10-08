"use client";

import { Clock, ChevronRight, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { formatTime } from "@/lib/date-format";
import { MealThumb } from "@/components/meal/meal-thumb";
import type { Meal } from "@/types/meal";

interface MealHistoryCardProps {
  meal: Meal;
  onSelect: (meal: Meal) => void;
}

export function MealHistoryCard({ meal, onSelect }: MealHistoryCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Fondo al deslizar: abre el editor */}
      <div className="absolute inset-[3px] flex items-center justify-end rounded-2xl bg-primary px-6 text-primary-foreground">
        <Pencil className="h-5 w-5" />
      </div>

      <motion.button
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -70) onSelect(meal);
        }}
        type="button"
        onClick={() => onSelect(meal)}
        className="surface group relative flex w-full items-center gap-3 p-3 text-left transition-colors hover:border-primary/40 sm:gap-4"
      >
        <MealThumb src={meal.imageUrl} className="h-14 w-14 shrink-0 rounded-xl sm:h-16 sm:w-16" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{meal.foodName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground tabular">
            <Clock className="h-3 w-3 shrink-0" />
            {formatTime(meal.createdAt)}
            {meal.isPlanned && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                Planeado
              </span>
            )}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground tabular">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-protein" />P {Math.round(meal.macros.protein)}g
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-carbs" />C {Math.round(meal.macros.carbs)}g
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-fat" />G {Math.round(meal.macros.fat)}g
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-lg font-semibold leading-none tabular">{meal.calories}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">kcal</p>
        </div>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary sm:block" />
      </motion.button>
    </motion.div>
  );
}
