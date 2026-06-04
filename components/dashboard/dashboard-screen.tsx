"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCalorieTracker } from "@/hooks/use-calorie-tracker";
import { getRecentActivities, getWeeklyProgress } from "@/lib/meals";
import { TipsCarousel } from "../home/tips-carousel";
import { CalorieLoader } from "@/components/ui/calorie-loader";
import {
  History,
  LogOut,
  Flame,
  Target,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import type { Meal } from "@/types/meal";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getGreeting, formatTodayLong } from "@/lib/date-format";
import { MealDetailDrawer } from "./meal-detail-drawer";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { motion } from "framer-motion";
import { AICoachDrawer } from "./ai-coach-drawer";
import { CommunityChallenges } from "./community-challenges";
import { CalorieProgressRing } from "./calorie-progress-ring";
import { StatTile } from "./stat-tile";
import { HydrationTracker } from "./hydration-tracker";
import { MacrosBreakdown } from "./macros-breakdown";
import { RecentMeals } from "./recent-meals";
import { WeeklyRhythm } from "./weekly-rhythm";

type WeeklyProgressData = Awaited<ReturnType<typeof getWeeklyProgress>>;

export function DashboardScreen({
  onViewHistory,
}: {
  onViewHistory: () => void;
}) {
  const [recentActivities, setRecentActivities] = useState<Meal[]>([]);
  const [weeklyProgress, setWeeklyProgress] =
    useState<WeeklyProgressData | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [detailMeal, setDetailMeal] = useState<Meal | null>(null);
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  const { user, logout } = useAuth();
  const {
    calorieData,
    loading: calorieLoading,
    error: calorieError,
    refreshData,
    mutate,
  } = useCalorieTracker();

  const displayName = useMemo(
    () => user?.displayName || user?.email?.split("@")[0] || "Usuario",
    [user]
  );

  const loadRecentActivities = useCallback(async () => {
    if (!user) return;
    setLoadingActivities(true);
    try {
      setRecentActivities(await getRecentActivities(user.uid, 5));
    } catch (error) {
      logger.error("Error loading recent activities", error);
    } finally {
      setLoadingActivities(false);
    }
  }, [user]);

  const loadWeeklyProgress = useCallback(async () => {
    if (!user) return;
    setLoadingProgress(true);
    try {
      setWeeklyProgress(await getWeeklyProgress(user.uid));
    } catch (error) {
      logger.error("Error loading weekly progress", error);
    } finally {
      setLoadingProgress(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadRecentActivities();
      loadWeeklyProgress();
    }
  }, [user, loadRecentActivities, loadWeeklyProgress]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error("Error logging out", error);
    }
  };

  const goal = calorieData?.dailyGoal ?? 0;
  const consumed = calorieData?.consumed ?? 0;
  const overGoal = calorieData ? calorieData.remaining < 0 : false;
  const dataReady = Boolean(calorieData && !calorieLoading && !calorieError);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background pb-28 md:pb-10"
    >
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-background to-chart-2/[0.06]" aria-hidden />
        <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-primary/25 blur-3xl sm:right-12" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-chart-2/20 blur-3xl" aria-hidden />

        <div className="relative z-10 mx-auto max-w-full px-4 pt-8 pb-10 sm:px-8 lg:pt-10 lg:pb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Resumen diario
                </p>
                {calorieData?.streak ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-black text-orange-600 dark:text-orange-400"
                  >
                    <Flame className="h-3 w-3 fill-current" />
                    {calorieData.streak} DÍAS
                  </motion.div>
                ) : null}
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {getGreeting()},{" "}
                <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                  {displayName}
                </span>
              </h1>
              <p className="mt-2 capitalize text-muted-foreground text-sm sm:text-base">
                {formatTodayLong()}
              </p>
            </div>
            <div className="flex shrink-0 gap-2 self-start sm:self-auto">
              <ThemeToggle />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsCoachOpen(true)}
                className="h-11 w-11 rounded-xl border-primary/20 bg-primary/5 text-primary shadow-sm backdrop-blur-sm hover:bg-primary/10"
                aria-label="Abrir Coach de IA"
              >
                <Sparkles className="h-5 w-5 fill-current opacity-70" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onViewHistory}
                className="h-11 w-11 rounded-xl border-border/80 bg-card/80 shadow-sm backdrop-blur-sm"
                aria-label="Ver historial"
              >
                <History className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                className="h-11 w-11 rounded-xl border-border/80 bg-card/80 shadow-sm backdrop-blur-sm"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-5"
            >
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-3xl border border-border/80 bg-card/90 p-6 shadow-lg shadow-primary/5 backdrop-blur-sm sm:p-8">
                {calorieLoading ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="h-36 w-36 animate-pulse rounded-full bg-muted" />
                    <p className="text-sm text-muted-foreground">Sincronizando tu meta…</p>
                  </div>
                ) : calorieError ? (
                  <div className="text-center px-2">
                    <p className="text-sm font-medium text-destructive">No pudimos calcular tu meta</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={refreshData}>
                      Reintentar
                    </Button>
                  </div>
                ) : calorieData && goal > 0 ? (
                  <CalorieProgressRing consumed={consumed} goal={goal} overGoal={overGoal} />
                ) : (
                  <div className="text-center text-muted-foreground text-sm max-w-xs">
                    Completa tu perfil para ver el anillo de progreso frente a tu meta diaria.
                  </div>
                )}
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7 lg:grid-cols-2">
              <StatTile
                icon={Flame}
                label="Calorías hoy"
                value={consumed}
                sub="Registradas en tus comidas"
                className="col-span-2 sm:col-span-1"
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="col-span-2 sm:col-span-1 rounded-[2rem] border border-border/40 bg-card/60 p-5 shadow-2xl shadow-black/[0.03] backdrop-blur-md"
              >
                {user && calorieData && (
                  <HydrationTracker
                    glasses={calorieData.waterGlasses}
                    userId={user.uid}
                    mutate={mutate}
                  />
                )}
                {!calorieData && !calorieLoading && (
                  <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground">
                    Cargando hidratación...
                  </div>
                )}
              </motion.div>

              {calorieLoading ? (
                <div className="col-span-2">
                  <CalorieLoader message="Calculando tu meta calórica…" />
                </div>
              ) : calorieError ? (
                <div className="col-span-2 rounded-2xl border border-destructive/25 bg-destructive/5 p-5">
                  <p className="text-sm text-destructive font-medium">Error al cargar la meta</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={refreshData}>
                    Reintentar
                  </Button>
                </div>
              ) : calorieData ? (
                <StatTile
                  icon={Target}
                  label="Restantes"
                  value={calorieData.remaining}
                  sub={`Meta ${calorieData.dailyGoal} kcal`}
                  className={cn(
                    "col-span-2 sm:col-span-2 lg:col-span-2",
                    overGoal && "border-warning/40 bg-warning/5"
                  )}
                />
              ) : (
                <div className="col-span-2 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center text-sm text-muted-foreground">
                  Completa el onboarding para ver calorías restantes.
                </div>
              )}

              {dataReady && calorieData ? (
                <MacrosBreakdown
                  consumed={calorieData.consumedMacros}
                  goal={calorieData.macros}
                />
              ) : null}
            </div>
          </div>

          {dataReady && calorieData ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-wrap gap-4 items-center"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/40 border border-border/40 text-[11px] font-bold">
                <span className="text-muted-foreground uppercase tracking-wider">BMR:</span>
                <span className="text-foreground">{calorieData.bmr} kcal</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/40 border border-border/40 text-[11px] font-bold">
                <span className="text-muted-foreground uppercase tracking-wider">TDEE:</span>
                <span className="text-foreground">{calorieData.tdee} kcal</span>
              </div>
              <p className="text-xs font-medium text-muted-foreground italic">
                {calorieData.explanation}
              </p>
            </motion.div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-full px-4 sm:px-8 mt-12 pb-20">
        <TipsCarousel
          className="mb-12 border-none shadow-none bg-transparent p-0"
          dailyGoal={dataReady && calorieData ? calorieData.dailyGoal : undefined}
        />

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <RecentMeals
              loading={loadingActivities}
              meals={recentActivities}
              onSelect={setDetailMeal}
              onViewHistory={onViewHistory}
            />
            <div className="mt-12">
              <CommunityChallenges />
            </div>
          </div>

          <div className="lg:col-span-5">
            <WeeklyRhythm loading={loadingProgress} weeklyProgress={weeklyProgress} />
          </div>
        </div>
      </div>

      <MealDetailDrawer
        meal={detailMeal}
        open={detailMeal !== null}
        onOpenChange={(o) => {
          if (!o) setDetailMeal(null);
        }}
        onMealUpdated={() => {
          void loadRecentActivities();
          refreshData();
        }}
      />

      <AICoachDrawer open={isCoachOpen} onOpenChange={setIsCoachOpen} />
    </motion.div>
  );
}
