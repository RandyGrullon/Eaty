"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { deriveLastDays } from "@/lib/week-chart";
import type { WeeklyProgress } from "@/lib/app-data-derive";
import type { Meal } from "@/types/meal";

interface WeeklyRhythmProps {
  loading: boolean;
  meals: Meal[];
  dailyGoal?: number;
  weeklyProgress: WeeklyProgress | null;
}

const WEEKDAY = new Intl.DateTimeFormat("es", { weekday: "narrow" });

function Delta({ value, label }: { value: number; label: string }) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 flex items-center gap-1 text-sm font-semibold tabular",
          value > 0 && "text-success",
          value < 0 && "text-destructive"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {Math.abs(value)}%
      </p>
    </div>
  );
}

/** Calorías de los últimos 7 días frente a la meta, más la comparativa semanal. */
export function WeeklyRhythm({ loading, meals, dailyGoal, weeklyProgress }: WeeklyRhythmProps) {
  const bars = useMemo(() => deriveLastDays(meals, 7), [meals]);
  const max = Math.max(dailyGoal ?? 0, ...bars.map((b) => b.calories), 1) * 1.1;
  const goalPct = dailyGoal ? (dailyGoal / max) * 100 : null;
  const logged = bars.filter((b) => b.calories > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, b) => a + b.calories, 0) / logged.length) : 0;

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Últimos 7 días</h2>
          <p className="text-sm text-muted-foreground">
            Media <span className="font-semibold text-foreground tabular">{avg}</span> kcal/día
          </p>
        </div>
        {dailyGoal ? (
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <span className="h-0.5 w-3 rounded bg-foreground/50" /> Meta {dailyGoal}
          </span>
        ) : null}
      </div>

      <div className="relative mt-6 h-40">
        {goalPct !== null ? (
          <div
            className="absolute inset-x-0 border-t border-dashed border-foreground/30"
            style={{ bottom: `${goalPct}%` }}
            aria-hidden
          />
        ) : null}
        <div className="absolute inset-0 flex items-end gap-2 sm:gap-3">
          {bars.map((b, i) => {
            const h = loading ? 8 : Math.max((b.calories / max) * 100, b.calories ? 4 : 2);
            const over = dailyGoal ? b.calories > dailyGoal * 1.1 : false;
            return (
              <div key={b.date.toISOString()} className="group relative flex h-full flex-1 items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    "w-full rounded-lg",
                    b.calories === 0 ? "bg-muted" : over ? "bg-warning" : b.isToday ? "bg-primary" : "bg-primary/35"
                  )}
                />
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[11px] text-background opacity-0 transition-opacity group-hover:opacity-100 tabular">
                  {b.calories} kcal
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {bars.map((b) => (
          <span
            key={b.date.toISOString()}
            className={cn(
              "flex-1 text-center text-xs capitalize",
              b.isToday ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {WEEKDAY.format(b.date)}
          </span>
        ))}
      </div>

      {weeklyProgress ? (
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Delta label="Comidas" value={weeklyProgress.progress.mealsChange} />
          <Delta label="Calorías" value={weeklyProgress.progress.caloriesChange} />
          <Delta label="Días activos" value={weeklyProgress.progress.daysChange} />
        </div>
      ) : null}
    </section>
  );
}
