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
    <div className="relative">
      <div className="mb-6 flex items-center justify-between sticky top-[env(safe-area-inset-top)] z-20 py-2 bg-background/80 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-[64px] w-[64px] items-center justify-center rounded-[1.5rem] bg-card border border-border/40 shadow-xl shadow-black/[0.02] shrink-0 z-10">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase text-primary leading-none mb-1">{date.toLocaleDateString("es-ES", { month: "short" })}</p>
              <p className="text-xl font-black leading-none">{date.getDate()}</p>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-foreground capitalize">
              {date.toLocaleDateString("es-ES", { weekday: "long" })}
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              {date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Total Día</p>
          <p className="text-lg font-black tabular-nums text-primary leading-none">{dayCalories} <span className="text-[10px]">kcal</span></p>
        </div>
      </div>

      <div className="grid gap-3 sm:pl-20">
        <AnimatePresence mode="popLayout">
          {dayMeals.map((meal) => (
            <MealHistoryCard key={meal.id} meal={meal} onSelect={onSelect} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
