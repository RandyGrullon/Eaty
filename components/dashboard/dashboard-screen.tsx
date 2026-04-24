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
} from "lucide-react";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import type { Meal } from "@/types/meal";
import { cn } from "@/lib/utils";
import { MealDetailDrawer } from "./meal-detail-drawer";

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
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - pctDisplay);

  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto h-[200px] w-[200px] shrink-0">
        <svg
          width="200"
          height="200"
          viewBox="0 0 140 140"
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            className="stroke-muted/80"
            strokeWidth="10"
          />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dash}
            className={cn(
              "transition-[stroke-dashoffset] duration-700 ease-out",
              overGoal ? "stroke-warning" : "stroke-primary"
            )}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
            {Math.round(pctRaw * 100)}%
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            del objetivo
          </span>
        </div>
      </div>
      <div className="mt-4 flex gap-8 text-center text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Consumidas</p>
          <p className="font-semibold tabular-nums">{consumed}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Meta</p>
          <p className="font-semibold tabular-nums">{goal}</p>
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
        "rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 shadow-sm",
        "flex flex-col justify-between min-h-[120px] transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
          {value}
        </p>
        {sub ? (
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{sub}</p>
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
      console.error("Error loading today stats:", error);
    }
  };

  const loadRecentActivities = async () => {
    if (!user) return;
    setLoadingActivities(true);
    try {
      const activities = await getRecentActivities(user.uid, 5);
      setRecentActivities(activities);
    } catch (error) {
      console.error("Error loading recent activities:", error);
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
      console.error("Error loading weekly progress:", error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
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
                <div className="col-span-2 grid grid-cols-3 gap-2 rounded-2xl border border-border/80 bg-muted/20 p-4 sm:p-5">
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Proteína
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-chart-1">
                      {calorieData.macros.protein}g
                    </p>
                  </div>
                  <div className="text-center border-x border-border/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Carbos
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-chart-2">
                      {calorieData.macros.carbs}g
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Grasa
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-chart-4">
                      {calorieData.macros.fat}g
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {calorieData && !calorieLoading && !calorieError ? (
            <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              <span className="font-semibold text-foreground">BMR</span>{" "}
              {calorieData.bmr} kcal ·{" "}
              <span className="font-semibold text-foreground">TDEE</span>{" "}
              {calorieData.tdee} kcal — {calorieData.explanation}
            </p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 lg:py-14">
        <TipsCarousel />

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                  Últimas comidas
                </h2>
                <p className="text-sm text-muted-foreground">
                  Lo más reciente que registraste
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-primary shrink-0"
                onClick={onViewHistory}
              >
                Ver todo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative space-y-0">
              <div
                className="absolute left-[19px] top-3 bottom-3 w-px bg-border sm:left-[23px]"
                aria-hidden
              />
              {loadingActivities ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : recentActivities.length > 0 ? (
                <ul className="space-y-1">
                  {recentActivities.map((meal, i) => (
                    <li key={meal.id} className="relative">
                      <button
                        type="button"
                        onClick={() => setDetailMeal(meal)}
                        className="relative flex w-full gap-4 rounded-xl py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-5 sm:py-4"
                      >
                        <div className="relative z-10 flex shrink-0">
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border bg-card shadow-sm sm:h-12 sm:w-12",
                              i === 0 && "ring-2 ring-primary/30"
                            )}
                          >
                            {meal.imageUrl ? (
                              <img
                                src={meal.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Camera className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="font-medium leading-snug text-foreground">
                            {meal.foodName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {meal.createdAt.toLocaleString("es-ES", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="shrink-0 text-right pt-0.5">
                          <p className="text-sm font-bold tabular-nums text-primary">
                            {meal.calories}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            kcal
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center text-sm text-muted-foreground">
                  Aún no hay comidas registradas. Escanea tu primer plato.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mb-5">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                Ritmo semanal
              </h2>
              <p className="text-sm text-muted-foreground">
                Esta semana frente a la anterior
              </p>
            </div>

            {loadingProgress ? (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-border/60 bg-card/50">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : weeklyProgress ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/8 to-transparent shadow-sm">
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Esta semana
                      </p>
                      <p className="mt-3 text-3xl font-bold tabular-nums">
                        {weeklyProgress.currentWeek.totalMeals}
                      </p>
                      <p className="text-xs text-muted-foreground">comidas</p>
                      <p className="mt-4 text-2xl font-semibold tabular-nums text-chart-2">
                        {weeklyProgress.currentWeek.totalCalories}
                      </p>
                      <p className="text-xs text-muted-foreground">kcal totales</p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/80 bg-muted/15 shadow-sm">
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Semana anterior
                      </p>
                      <p className="mt-3 text-3xl font-bold tabular-nums text-muted-foreground">
                        {weeklyProgress.previousWeek.totalMeals}
                      </p>
                      <p className="text-xs text-muted-foreground">comidas</p>
                      <p className="mt-4 text-2xl font-semibold tabular-nums text-muted-foreground">
                        {weeklyProgress.previousWeek.totalCalories}
                      </p>
                      <p className="text-xs text-muted-foreground">kcal totales</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card/80 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Cambio vs semana pasada
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
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
                      <div key={row.label}>
                        <p className="text-[10px] text-muted-foreground">
                          {row.label}
                        </p>
                        <p
                          className={cn(
                            "mt-1 flex items-center justify-center gap-0.5 text-sm font-bold tabular-nums",
                            row.v > 0 && "text-chart-3",
                            row.v < 0 && "text-destructive",
                            row.v === 0 && "text-muted-foreground"
                          )}
                        >
                          {row.v > 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : row.v < 0 ? (
                            <TrendingDown className="h-3.5 w-3.5" />
                          ) : null}
                          {Math.abs(row.v)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
                Sin datos de semanas aún.
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
