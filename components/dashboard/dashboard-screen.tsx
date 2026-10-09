"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { TipsCarousel } from "../home/tips-carousel";
import { CalendarDays, Camera, Flame, Info, Salad } from "lucide-react";
import { getGreeting, formatTodayLong } from "@/lib/date-format";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { EatyMark } from "@/components/app/eaty-logo";
import { CalorieProgressRing } from "./calorie-progress-ring";
import { HydrationTracker } from "./hydration-tracker";
import { MacrosBreakdown } from "./macros-breakdown";
import { RecentMeals } from "./recent-meals";
import { WeeklyRhythm } from "./weekly-rhythm";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function DashboardScreen({
  onViewHistory,
  onOpenPlanner,
  onScan,
}: {
  onViewHistory: () => void;
  onOpenPlanner: () => void;
  onScan?: () => void;
}) {
  const { user } = useAuth();
  const { calorieData, loading, meals, recentMeals, todayMeals, weeklyProgress, activeDiet, openMealEditor } =
    useAppData();

  const displayName = useMemo(() => {
    const raw = user?.displayName || user?.email?.split("@")[0] || "";
    return raw.split(" ")[0];
  }, [user]);

  const goal = calorieData?.dailyGoal ?? 0;
  const consumed = calorieData?.consumed ?? 0;
  const overGoal = calorieData ? calorieData.remaining < 0 : false;
  const hasGoal = Boolean(calorieData && goal > 0);

  return (
    <div className="min-h-full bg-background pb-32 md:pb-12">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        {/* Cabecera */}
        <motion.header {...fadeUp()} className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <EatyMark className="h-10 w-10 md:hidden" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground first-letter:uppercase">{formatTodayLong().toLowerCase()}</p>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
                {getGreeting()}
                {displayName ? `, ${displayName}` : ""}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {calorieData?.streak ? (
              <span className="hidden items-center gap-1.5 rounded-full bg-protein/12 px-3 py-1.5 text-sm font-semibold text-protein sm:flex">
                <Flame className="h-4 w-4" />
                {calorieData.streak} días
              </span>
            ) : null}
            <Button
              variant="outline"
              onClick={onOpenPlanner}
              className="h-10 gap-2 rounded-full px-3 sm:px-4"
              aria-label="Abrir planificador semanal"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Planificar</span>
            </Button>
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
        </motion.header>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5 [&>*]:min-w-0">
          {/* Resumen del día */}
          <motion.section {...fadeUp(0.05)} className="surface p-5 sm:p-7 lg:col-span-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Hoy</h2>
                <p className="text-sm text-muted-foreground">
                  {todayMeals.length === 0
                    ? "Sin comidas registradas todavía"
                    : `${todayMeals.length} ${todayMeals.length === 1 ? "comida registrada" : "comidas registradas"}`}
                </p>
              </div>
              {activeDiet ? (
                <span className="flex max-w-[55%] items-center gap-1.5 truncate rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  <Salad className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{activeDiet.name}</span>
                </span>
              ) : null}
            </div>

            {loading ? (
              <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row">
                <div className="h-[196px] w-[196px] animate-pulse rounded-full bg-muted" />
                <div className="w-full flex-1 space-y-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              </div>
            ) : hasGoal && calorieData ? (
              <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row sm:items-center">
                <CalorieProgressRing consumed={consumed} goal={goal} overGoal={overGoal} />
                <div className="w-full flex-1">
                  <dl className="mb-6 grid grid-cols-3 gap-2 text-center sm:text-left">
                    {[
                      { label: "Meta", value: goal },
                      { label: "Consumido", value: consumed },
                      { label: "Gasto", value: calorieData.tdee },
                    ].map((s) => (
                      <div key={s.label} className="min-w-0 rounded-xl bg-muted/60 px-2.5 py-2">
                        <dt className="truncate text-xs text-muted-foreground">{s.label}</dt>
                        <dd className="font-display text-lg font-semibold tabular sm:text-xl">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <MacrosBreakdown consumed={calorieData.consumedMacros} goal={calorieData.macros} />
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Completa tu perfil (peso, altura y actividad) para calcular tu meta diaria.
              </div>
            )}

            {calorieData && hasGoal ? (
              <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  Metabolismo basal {calorieData.bmr} kcal. {calorieData.explanation}
                </span>
              </p>
            ) : null}
          </motion.section>

          {/* Columna lateral */}
          <div className="grid min-w-0 grid-cols-1 gap-4 lg:col-span-4 lg:gap-5">
            <motion.button
              {...fadeUp(0.1)}
              type="button"
              onClick={onScan}
              className="group relative overflow-hidden rounded-2xl bg-primary p-5 text-left text-primary-foreground shadow-lg shadow-primary/20"
            >
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary-foreground/10" aria-hidden />
              <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-accent/25" aria-hidden />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15">
                <Camera className="h-5 w-5" />
              </span>
              <p className="relative mt-4 font-display text-xl font-semibold">Registrar comida</p>
              <p className="relative mt-1 text-sm opacity-85">
                Haz una foto, descríbela o escanea el código de barras.
              </p>
            </motion.button>

            <motion.div {...fadeUp(0.15)} className="surface p-5">
              {calorieData ? (
                <HydrationTracker glasses={calorieData.waterGlasses} />
              ) : (
                <div className="h-24 animate-pulse rounded-xl bg-muted" />
              )}
            </motion.div>
          </div>

          <motion.div {...fadeUp(0.2)} className="lg:col-span-7">
            <RecentMeals
              loading={loading}
              meals={recentMeals}
              onSelect={openMealEditor}
              onViewHistory={onViewHistory}
              onScan={onScan}
            />
          </motion.div>
          <motion.div {...fadeUp(0.25)} className="lg:col-span-5">
            <WeeklyRhythm
              loading={loading}
              meals={meals}
              dailyGoal={hasGoal ? goal : undefined}
              weeklyProgress={loading ? null : weeklyProgress}
            />
          </motion.div>
        </div>

        <div className="mt-8">
          <TipsCarousel dailyGoal={hasGoal ? goal : undefined} />
        </div>
      </div>
    </div>
  );
}
