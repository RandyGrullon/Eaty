"use client";

import { Loader2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { getWeeklyProgress } from "@/lib/meals";

type WeeklyProgressData = Awaited<ReturnType<typeof getWeeklyProgress>>;

interface WeeklyRhythmProps {
  loading: boolean;
  weeklyProgress: WeeklyProgressData | null;
}

export function WeeklyRhythm({ loading, weeklyProgress }: WeeklyRhythmProps) {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tight text-foreground">
          Ritmo semanal
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          Comparativa con tu actividad previa
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-border/40 bg-card/20 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
        </div>
      ) : weeklyProgress ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-card/50 p-6 shadow-2xl shadow-primary/5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Esta semana
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <p className="text-4xl font-black tabular-nums tracking-tighter">
                  {weeklyProgress.currentWeek.totalMeals}
                </p>
                <p className="text-xs font-bold text-muted-foreground">comidas</p>
              </div>
              <div className="mt-6">
                <p className="text-2xl font-black tabular-nums tracking-tighter text-chart-2">
                  {weeklyProgress.currentWeek.totalCalories}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">kcal totales</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-sm backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Semana anterior
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <p className="text-4xl font-black tabular-nums tracking-tighter text-muted-foreground/60">
                  {weeklyProgress.previousWeek.totalMeals}
                </p>
                <p className="text-xs font-bold text-muted-foreground/40">comidas</p>
              </div>
              <div className="mt-6">
                <p className="text-2xl font-black tabular-nums tracking-tighter text-muted-foreground/60">
                  {weeklyProgress.previousWeek.totalCalories}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">kcal totales</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-xl shadow-black/[0.02] backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-4 w-4" />
              Progreso vs semana pasada
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Comidas", v: weeklyProgress.progress.mealsChange },
                { label: "Calorías", v: weeklyProgress.progress.caloriesChange },
                { label: "Días activos", v: weeklyProgress.progress.daysChange },
              ].map((row) => (
                <div key={row.label} className="group">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 group-hover:text-primary transition-colors">
                    {row.label}
                  </p>
                  <div
                    className={cn(
                      "flex items-center justify-center gap-0.5 text-lg font-black tabular-nums transition-transform group-hover:scale-110",
                      row.v > 0 && "text-chart-3",
                      row.v < 0 && "text-destructive",
                      row.v === 0 && "text-muted-foreground/40"
                    )}
                  >
                    {row.v > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : row.v < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                    {Math.abs(row.v)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed border-border/40 bg-muted/10 py-16 text-center">
          <p className="text-sm font-bold text-muted-foreground/40">
            Sin datos comparativos suficientes.
          </p>
        </div>
      )}
    </>
  );
}
