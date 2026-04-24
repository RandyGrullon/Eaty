"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Eye,
  Clock,
  CalendarDays,
  Calendar as CalendarIcon,
  Camera,
  UtensilsCrossed,
  Download,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getUserMeals } from "@/lib/meals";
import type { Meal } from "@/types/meal";
import { MealDetailModal } from "./meal-detail-modal";
import { cn } from "@/lib/utils";

interface MealHistoryProps {
  onBack: () => void;
}

export function MealHistory({ onBack }: MealHistoryProps) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<"day" | "week" | "month">(
    "week"
  );
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);

  const { user } = useAuth();

  const applyFilter = useCallback(() => {
    if (meals.length === 0) {
      setFilteredMeals([]);
      return;
    }
    const now = new Date();
    let startDate: Date;

    switch (filterPeriod) {
      case "day":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    setFilteredMeals(meals.filter((meal) => meal.createdAt >= startDate));
  }, [meals, filterPeriod]);

  useEffect(() => {
    if (user) {
      loadMeals();
    }
  }, [user]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  const loadMeals = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const userMeals = await getUserMeals(user.uid);
      setMeals(userMeals);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hoy, ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer, ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCaloriesBadgeColor = (calories: number) => {
    if (calories < 200)
      return "bg-chart-3/15 text-chart-3 border border-chart-3/25";
    if (calories < 400)
      return "bg-chart-4/15 text-chart-4 border border-chart-4/25";
    if (calories < 600)
      return "bg-warning/20 text-warning-foreground border border-warning/30";
    return "bg-destructive/10 text-destructive border border-destructive/25";
  };

  const groupMealsByDate = (list: Meal[]) => {
    const groups: { [key: string]: Meal[] } = {};
    list.forEach((meal) => {
      const dateKey = meal.createdAt.toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(meal);
    });
    return Object.entries(groups).sort(
      ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
    );
  };

  const getFilterIcon = (period: "day" | "week" | "month") => {
    switch (period) {
      case "day":
        return <Clock className="h-3.5 w-3.5" />;
      case "week":
        return <CalendarDays className="h-3.5 w-3.5" />;
      case "month":
        return <CalendarIcon className="h-3.5 w-3.5" />;
    }
  };

  const getFilterLabel = (period: "day" | "week" | "month") => {
    switch (period) {
      case "day":
        return "Hoy";
      case "week":
        return "Semana";
      case "month":
        return "Mes";
    }
  };

  const exportFilteredJson = () => {
    const payload = filteredMeals.map((m) => ({
      id: m.id,
      foodName: m.foodName,
      calories: m.calories,
      macros: m.macros,
      recommendations: m.recommendations,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt.toISOString(),
    }));
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            filter: filterPeriod,
            meals: payload,
          },
          null,
          2
        ),
      ],
      { type: "application/json;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eaty-historial-${filterPeriod}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const header = (
    <div className="relative z-10 mx-auto flex max-w-3xl items-center gap-3 px-4 pt-8 pb-6 sm:px-6">
      <Button
        variant="outline"
        size="icon"
        onClick={onBack}
        className="h-10 w-10 shrink-0 rounded-xl border-border/80 bg-card/90 shadow-sm backdrop-blur-sm"
        aria-label="Volver"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Historial
        </h1>
        <p className="text-sm text-muted-foreground">
          {filteredMeals.length} de {meals.length} en{" "}
          {getFilterLabel(filterPeriod).toLowerCase()}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5 rounded-xl"
        onClick={exportFilteredJson}
        disabled={filteredMeals.length === 0}
      >
        <Download className="h-4 w-4" />
        Exportar JSON
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28 md:pb-10">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background to-chart-2/[0.06]"
            aria-hidden
          />
          {header}
        </section>
        <div className="flex justify-center py-20">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-28 md:pb-10">
        <section className="relative overflow-hidden border-b border-border/60">
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background to-chart-2/[0.06]"
            aria-hidden
          />
          {header}
        </section>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="text-destructive text-sm font-medium">{error}</p>
          <Button onClick={loadMeals} variant="outline" className="mt-6 rounded-xl">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const groupedMeals = groupMealsByDate(filteredMeals);
  const totalCal = filteredMeals.reduce((s, m) => s + m.calories, 0);
  const avgCal =
    filteredMeals.length > 0
      ? Math.round(totalCal / filteredMeals.length)
      : 0;

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background to-chart-2/[0.06]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        {header}
      </section>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["day", "week", "month"] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setFilterPeriod(period)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                filterPeriod === period
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border/80 bg-card/90 text-muted-foreground hover:border-primary/25 hover:text-foreground"
              )}
            >
              {getFilterIcon(period)}
              {getFilterLabel(period)}
            </button>
          ))}
        </div>

        {filteredMeals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              {filterPeriod === "day"
                ? "Sin comidas hoy"
                : filterPeriod === "week"
                  ? "Sin comidas esta semana"
                  : "Sin comidas este mes"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Registra platos desde Escanear para verlos aquí.
            </p>
            <Button onClick={onBack} className="mt-8 rounded-xl">
              Ir a escanear
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 text-center shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Registros
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
                  {filteredMeals.length}
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 text-center shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Promedio
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-chart-2">
                  {avgCal}
                </p>
                <p className="text-[10px] text-muted-foreground">kcal</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 text-center shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Total
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-chart-3">
                  {totalCal}
                </p>
                <p className="text-[10px] text-muted-foreground">kcal</p>
              </div>
            </div>

            <div className="space-y-10">
              {groupedMeals.map(([dateString, dayMeals]) => {
                const date = new Date(dateString);
                const dayCalories = dayMeals.reduce((s, m) => s + m.calories, 0);

                return (
                  <div key={dateString}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <UtensilsCrossed className="h-4 w-4 shrink-0 text-primary" />
                        <h3 className="truncate text-sm font-semibold capitalize text-foreground sm:text-base">
                          {date.toLocaleDateString("es-ES", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </h3>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 rounded-full px-3 font-mono text-xs"
                      >
                        {dayCalories} kcal
                      </Badge>
                    </div>

                    <ul className="space-y-2">
                      {dayMeals.map((meal) => (
                        <li key={meal.id}>
                          <Card className="overflow-hidden border-border/70 transition-shadow hover:shadow-md">
                            <CardContent className="p-0">
                              <button
                                type="button"
                                onClick={() => setSelectedMeal(meal)}
                                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/30"
                              >
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted">
                                  {meal.imageUrl ? (
                                    <img
                                      src={meal.imageUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Camera className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium leading-snug text-foreground line-clamp-2">
                                    {meal.foodName}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {formatDate(meal.createdAt)}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span
                                      className={cn(
                                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                        getCaloriesBadgeColor(meal.calories)
                                      )}
                                    >
                                      {meal.calories} kcal
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      P {meal.macros.protein}g · C{" "}
                                      {meal.macros.carbs}g · G {meal.macros.fat}g
                                    </span>
                                  </div>
                                </div>
                                <Eye
                                  className="h-5 w-5 shrink-0 text-muted-foreground"
                                  aria-hidden
                                />
                              </button>
                            </CardContent>
                          </Card>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedMeal ? (
        <MealDetailModal
          meal={selectedMeal}
          onClose={() => setSelectedMeal(null)}
          onDelete={loadMeals}
        />
      ) : null}
    </div>
  );
}
