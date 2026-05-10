"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useCalorieTracker } from "@/hooks/use-calorie-tracker";
import {
  getTodayStats,
  getRecentActivities,
  getWeeklyProgress,
} from "@/lib/meals";
import { TipsCarousel } from "../home/tips-carousel";
import { CalorieLoader } from "@/components/ui/calorie-loader";
import {
  History,
  LogOut,
  Flame,
  Camera,
  Target,
  UtensilsCrossed,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import type { Meal } from "@/types/meal";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { MealDetailDrawer } from "./meal-detail-drawer";
import { ThemeToggle } from "@/components/app/theme-toggle";

type WeeklyProgressData = Awaited<ReturnType<typeof getWeeklyProgress>>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function formatTodayLong(): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function CalorieProgressRing({
  consumed,
  goal,
  overGoal,
}: {
  consumed: number;
  goal: number;
  overGoal: boolean;
}) {
  const pctRaw = goal > 0 ? consumed / goal : 0;
  const pctDisplay = Math.min(pctRaw, 1);
  const r = 58;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - pctDisplay);

  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto h-[220px] w-[220px] shrink-0 group">
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-8 rounded-full blur-2xl opacity-20 transition-all duration-700",
          overGoal ? "bg-warning" : "bg-primary"
        )} />
        
        <svg
          width="220"
          height="220"
          viewBox="0 0 140 140"
          className="absolute inset-0 -rotate-90 drop-shadow-sm"
          aria-hidden
        >
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            className="stroke-muted/40"
            strokeWidth="8"
          />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dash}
            className={cn(
              "transition-[stroke-dashoffset] duration-1000 ease-in-out",
              overGoal ? "stroke-warning" : "stroke-primary"
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-center">
            <span className="text-4xl font-black tabular-nums tracking-tighter text-foreground sm:text-5xl">
              {Math.round(pctRaw * 100)}%
            </span>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", overGoal ? "bg-warning" : "bg-primary")} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                Logrado
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-10">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Consumidas</p>
          <p className="text-lg font-black tabular-nums text-foreground">{consumed}</p>
        </div>
        <div className="h-8 w-px bg-border/40" />
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Objetivo</p>
          <p className="text-lg font-black tabular-nums text-foreground">{goal}</p>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  className,
}: {
  icon: typeof Flame;
  label: string;
  value: ReactNode;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group rounded-[2rem] border border-border/40 bg-card/60 p-5 sm:p-6 shadow-2xl shadow-black/[0.03] backdrop-blur-md",
        "flex flex-col justify-between min-h-[140px] transition-all duration-300 hover:shadow-primary/5 hover:-translate-y-1",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:scale-110">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 pt-1">
          {label}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-3xl sm:text-4xl font-black tabular-nums tracking-tighter text-foreground">
          {value}
        </p>
        {sub ? (
          <p className="text-xs font-medium text-muted-foreground mt-1.5 leading-snug">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

export function DashboardScreen({
  onViewHistory,
}: {
  onViewHistory: () => void;
}) {
  const [todayStats, setTodayStats] = useState({
    mealsCount: 0,
    totalCalories: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Meal[]>([]);
  const [weeklyProgress, setWeeklyProgress] =
    useState<WeeklyProgressData | null>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [detailMeal, setDetailMeal] = useState<Meal | null>(null);

  const { user, logout } = useAuth();
  const {
    calorieData,
    loading: calorieLoading,
    error: calorieError,
    refreshData,
  } = useCalorieTracker();

  const displayName = useMemo(
    () => user?.displayName || user?.email?.split("@")[0] || "Usuario",
    [user]
  );

  useEffect(() => {
    if (user) {
      loadTodayStats();
      loadRecentActivities();
      loadWeeklyProgress();
    }
  }, [user]);

  const loadTodayStats = async () => {
    if (!user) return;
    try {
      const stats = await getTodayStats(user.uid);
      setTodayStats(stats);
      refreshData();
    } catch (error) {
      logger.error("Error loading today stats", error);
    }
  };

  const loadRecentActivities = async () => {
    if (!user) return;
    setLoadingActivities(true);
    try {
      const activities = await getRecentActivities(user.uid, 5);
      setRecentActivities(activities);
    } catch (error) {
      logger.error("Error loading recent activities", error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadWeeklyProgress = async () => {
    if (!user) return;
    setLoadingProgress(true);
    try {
      const progress = await getWeeklyProgress(user.uid);
      setWeeklyProgress(progress);
    } catch (error) {
      logger.error("Error loading weekly progress", error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error("Error logging out", error);
    }
  };

  const goal = calorieData?.dailyGoal ?? 0;
  const consumed = todayStats.totalCalories;
  const overGoal = calorieData ? calorieData.remaining < 0 : false;

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-background to-chart-2/[0.06]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-primary/25 blur-3xl sm:right-12"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-chart-2/20 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6 lg:pt-10 lg:pb-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Resumen diario
              </p>
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
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            <div className="lg:col-span-5">
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-3xl border border-border/80 bg-card/90 p-6 shadow-lg shadow-primary/5 backdrop-blur-sm sm:p-8">
                {calorieLoading ? (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="h-36 w-36 animate-pulse rounded-full bg-muted" />
                    <p className="text-sm text-muted-foreground">
                      Sincronizando tu meta…
                    </p>
                  </div>
                ) : calorieError ? (
                  <div className="text-center px-2">
                    <p className="text-sm font-medium text-destructive">
                      No pudimos calcular tu meta
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={refreshData}
                    >
                      Reintentar
                    </Button>
                  </div>
                ) : calorieData && goal > 0 ? (
                  <CalorieProgressRing
                    consumed={consumed}
                    goal={goal}
                    overGoal={overGoal}
                  />
                ) : (
                  <div className="text-center text-muted-foreground text-sm max-w-xs">
                    Completa tu perfil para ver el anillo de progreso frente a tu
                    meta diaria.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7 lg:grid-cols-2">
              <StatTile
                icon={Flame}
                label="Calorías hoy"
                value={todayStats.totalCalories}
                sub="Registradas en tus comidas"
                className="col-span-2 sm:col-span-1"
              />
              <StatTile
                icon={UtensilsCrossed}
                label="Comidas"
                value={todayStats.mealsCount}
                sub="Registros de hoy"
                className="col-span-2 sm:col-span-1"
              />
              {calorieLoading ? (
                <div className="col-span-2">
                  <CalorieLoader message="Calculando tu meta calórica…" />
                </div>
              ) : calorieError ? (
                <div className="col-span-2 rounded-2xl border border-destructive/25 bg-destructive/5 p-5">
                  <p className="text-sm text-destructive font-medium">
                    Error al cargar la meta
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={refreshData}
                  >
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

              {calorieData && !calorieLoading && !calorieError ? (
                <div className="col-span-2 grid grid-cols-3 gap-3 rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-inner backdrop-blur-sm">
                  <div className="text-center group">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-1">
                      Proteína
                    </p>
                    <div className="flex flex-col items-center">
                      <p className="text-2xl font-black tabular-nums text-chart-1 group-hover:scale-110 transition-transform">
                        {calorieData.macros.protein}g
                      </p>
                      <div className="mt-1 h-1 w-8 rounded-full bg-chart-1/30" />
                    </div>
                  </div>
                  <div className="text-center group border-x border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-1">
                      Carbos
                    </p>
                    <div className="flex flex-col items-center">
                      <p className="text-2xl font-black tabular-nums text-chart-2 group-hover:scale-110 transition-transform">
                        {calorieData.macros.carbs}g
                      </p>
                      <div className="mt-1 h-1 w-8 rounded-full bg-chart-2/30" />
                    </div>
                  </div>
                  <div className="text-center group">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-1">
                      Grasa
                    </p>
                    <div className="flex flex-col items-center">
                      <p className="text-2xl font-black tabular-nums text-chart-4 group-hover:scale-110 transition-transform">
                        {calorieData.macros.fat}g
                      </p>
                      <div className="mt-1 h-1 w-8 rounded-full bg-chart-4/30" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {calorieData && !calorieLoading && !calorieError ? (
            <div className="mt-8 flex flex-wrap gap-4 items-center">
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
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6 lg:py-20">
        <TipsCarousel
          dailyGoal={
            calorieData && !calorieLoading && !calorieError
              ? calorieData.dailyGoal
              : undefined
          }
        />

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  Últimas comidas
                </h2>
                <p className="text-sm font-medium text-muted-foreground">
                  Tu registro fotográfico más reciente
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="group gap-1 text-primary hover:bg-primary/5 font-bold"
                onClick={onViewHistory}
              >
                Ver todo
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="relative">
              {loadingActivities ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {recentActivities.map((meal) => (
                    <button
                      key={meal.id}
                      type="button"
                      onClick={() => setDetailMeal(meal)}
                      className="group flex w-full items-center gap-4 rounded-3xl border border-border/40 bg-card/40 p-3 pr-5 text-left transition-all hover:bg-card hover:shadow-xl hover:shadow-black/[0.02] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:gap-5"
                    >
                      <div className="relative shrink-0">
                        <div className="h-14 w-14 overflow-hidden rounded-2xl border border-border/40 bg-muted shadow-inner sm:h-16 sm:w-16">
                          {meal.imageUrl ? (
                            <img
                              src={meal.imageUrl}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Camera className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {meal.foodName}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-0.5">
                          {meal.createdAt.toLocaleString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xl font-black tabular-nums text-primary tracking-tighter">
                          {meal.calories}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          kcal
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[2.5rem] border-2 border-dashed border-border/40 bg-muted/20 py-16 text-center">
                  <UtensilsCrossed className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
                  <p className="text-sm font-bold text-muted-foreground">
                    Aún no hay comidas registradas.
                  </p>
                  <Button variant="link" className="mt-2 text-primary font-bold">Escanea tu primer plato ahora</Button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                Ritmo semanal
              </h2>
              <p className="text-sm font-medium text-muted-foreground">
                Comparativa con tu actividad previa
              </p>
            </div>

            {loadingProgress ? (
              <div className="flex h-64 items-center justify-center rounded-3xl border border-border/40 bg-card/20 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
              </div>
            ) : weeklyProgress ? (
              <div className="space-y-6">
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
                      {
                        label: "Comidas",
                        v: weeklyProgress.progress.mealsChange,
                      },
                      {
                        label: "Calorías",
                        v: weeklyProgress.progress.caloriesChange,
                      },
                      {
                        label: "Días activos",
                        v: weeklyProgress.progress.daysChange,
                      },
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
              </div>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-border/40 bg-muted/10 py-16 text-center">
                <p className="text-sm font-bold text-muted-foreground/40">
                  Sin datos comparativos suficientes.
                </p>
              </div>
            )}
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
    </div>
  );
}
