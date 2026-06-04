"use client";

import { Clock, Camera, ChevronRight, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/date-format";
import type { Meal } from "@/types/meal";

function getCaloriesBadgeColor(calories: number): string {
  if (calories < 200) return "bg-chart-3/15 text-chart-3 border border-chart-3/25";
  if (calories < 400) return "bg-chart-4/15 text-chart-4 border border-chart-4/25";
  if (calories < 600) return "bg-warning/20 text-warning-foreground border border-warning/30";
  return "bg-destructive/10 text-destructive border border-destructive/25";
}

interface MealHistoryCardProps {
  meal: Meal;
  onSelect: (meal: Meal) => void;
}

export function MealHistoryCard({ meal, onSelect }: MealHistoryCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -100 }}
      className="relative"
    >
      {/* Background for swipe */}
      <div className="absolute inset-0 flex items-center justify-end rounded-[2rem] bg-destructive px-8 text-white">
        <Trash2 className="h-6 w-6" />
      </div>

      <motion.button
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -70) onSelect(meal);
        }}
        type="button"
        onClick={() => onSelect(meal)}
        className="group relative flex w-full items-center gap-4 rounded-[2rem] border border-border/40 bg-card p-3 pr-6 text-left transition-all hover:shadow-2xl hover:shadow-black/[0.03] sm:p-4 sm:pr-8"
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-muted shadow-inner sm:h-20 sm:w-20">
          {meal.imageUrl ? (
            <img
              src={meal.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted/50">
              <Camera className="h-8 w-8 text-muted-foreground/20" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
            {meal.foodName}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            <Clock className="h-3 w-3" />
            {formatTime(meal.createdAt)}
            {meal.isPlanned && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] text-primary opacity-100">
                Planeado
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className={cn("rounded-full px-3 py-1 text-[11px] font-black tabular-nums shadow-sm", getCaloriesBadgeColor(meal.calories))}>
              {meal.calories} kcal
            </div>
            <div className="text-[10px] font-bold text-muted-foreground tracking-tight bg-accent/50 px-2 py-0.5 rounded-lg">
              P <span className="text-foreground">{meal.macros.protein}g</span> ·
              C <span className="text-foreground">{meal.macros.carbs}g</span> ·
              G <span className="text-foreground">{meal.macros.fat}g</span>
            </div>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/50 text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary">
          <ChevronRight className="h-5 w-5" />
        </div>
      </motion.button>
    </motion.div>
  );
}
