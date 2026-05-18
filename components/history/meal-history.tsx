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
  Loader2,
  ChevronRight,
  Search,
  Filter,
  X,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getUserMeals } from "@/lib/meals";
import type { Meal } from "@/types/meal";
import { MealDetailModal } from "./meal-detail-modal";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface MealHistoryProps {
  onBack: () => void;
}

export function MealHistory({ onBack }: MealHistoryProps) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<"day" | "week" | "month" | "all">(
    "week"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [calorieRange, setCalorieRange] = useState<"all" | "low" | "mid" | "high">("all");
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);

  const { user } = useAuth();

  const applyFilters = useCallback(() => {
    if (meals.length === 0) {
      setFilteredMeals([]);
      return;
    }
    
    let result = [...meals];

    // 1. Filtro de Período
    const now = new Date();
    let startDate: Date | null = null;

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
      case "all":
        startDate = null;
        break;
    }

    if (startDate) {
      result = result.filter((meal) => meal.createdAt >= startDate!);
    }

    // 2. Filtro de Búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(meal => 
        meal.foodName.toLowerCase().includes(q)
      );
    }

    // 3. Filtro de Calorías
    if (calorieRange !== "all") {
      result = result.filter(meal => {
        if (calorieRange === "low") return meal.calories < 200;
        if (calorieRange === "mid") return meal.calories >= 200 && meal.calories < 500;
        if (calorieRange === "high") return meal.calories >= 500;
        return true;
      });
    }

    setFilteredMeals(result);
  }, [meals, filterPeriod, searchQuery, calorieRange]);

  const loadMeals = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user) {
      loadMeals();
    }
  }, [user, loadMeals]);

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

  const getFilterIcon = (period: "day" | "week" | "month" | "all") => {
    switch (period) {
      case "day":
        return <Clock className="h-3.5 w-3.5" />;
      case "week":
        return <CalendarDays className="h-3.5 w-3.5" />;
      case "month":
        return <CalendarIcon className="h-3.5 w-3.5" />;
      case "all":
        return <Calendar className="h-3.5 w-3.5" />;
    }
  };

  const getFilterLabel = (period: "day" | "week" | "month" | "all") => {
    switch (period) {
      case "day":
        return "Hoy";
      case "week":
        return "Semana";
      case "month":
        return "Mes";
      case "all":
        return "Todo";
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
    <div className="relative z-10 mx-auto flex max-w-4xl items-center gap-4 px-4 pt-10 pb-8 sm:px-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="h-12 w-12 shrink-0 rounded-[1.25rem] border border-border/40 bg-card/40 shadow-sm backdrop-blur-xl hover:bg-card"
        aria-label="Volver"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Historial
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold px-2 py-0">
            {filteredMeals.length} registros
          </Badge>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            {getFilterLabel(filterPeriod)}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden sm:flex shrink-0 gap-2 rounded-2xl border-border/40 bg-card/40 font-bold shadow-sm backdrop-blur-sm"
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
      <div className="min-h-screen bg-background pb-32">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent" />
          {header}
        </section>
        <div className="flex justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent" />
          {header}
        </section>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
            <UtensilsCrossed className="h-10 w-10" />
          </div>
          <p className="text-lg font-bold text-foreground">{error}</p>
          <Button onClick={loadMeals} variant="default" className="mt-8 rounded-2xl font-black h-12 px-8 shadow-xl shadow-primary/20">
            Reintentar carga
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
    <div className="min-h-screen bg-background pb-32">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent" aria-hidden />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl opacity-50" aria-hidden />
        {header}
      </section>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-4 sm:px-8">
        <div className="flex flex-col gap-6">
          {/* Barra de Búsqueda y Botones de Período */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-xl border-border/40 bg-card/40 pl-10 pr-10 focus-visible:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-muted"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:pb-0">
              {(["day", "week", "month", "all"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setFilterPeriod(period)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black tracking-tight transition-all duration-300",
                    filterPeriod === period
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                      : "border-border/40 bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  {period !== "all" && getFilterIcon(period)}
                  {period === "all" ? "Todo" : getFilterLabel(period)}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros de Calorías */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mr-2">
              <Filter className="h-3 w-3" />
              Calorías:
            </div>
            {[
              { id: "all", label: "Cualquiera" },
              { id: "low", label: "< 200 kcal" },
              { id: "mid", label: "200-500 kcal" },
              { id: "high", label: "> 500 kcal" },
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setCalorieRange(range.id as any)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[10px] font-bold border transition-all",
                  calorieRange === range.id
                    ? "bg-primary/10 border-primary text-primary shadow-sm"
                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {filteredMeals.length === 0 ? (
          <div className="rounded-[3rem] border-2 border-dashed border-border/40 bg-muted/20 px-6 py-24 text-center">
            <Calendar className="mx-auto h-16 w-16 text-muted-foreground/20 mb-6" />
            <h3 className="text-xl font-black text-foreground">
              Nada por aquí...
            </h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground max-w-xs mx-auto">
              {filterPeriod === "day"
                ? "Aún no has registrado nada hoy. ¿Qué tal un snack saludable?"
                : "Parece que no hay registros en este periodo."}
            </p>
            <Button onClick={onBack} className="mt-10 rounded-2xl font-black h-14 px-10 shadow-xl shadow-primary/20">
              Registrar mi primera comida
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Registros", value: filteredMeals.length, color: "text-primary", bg: "bg-primary/5" },
                { label: "Promedio", value: `${avgCal} kcal`, color: "text-chart-2", bg: "bg-chart-2/5" },
                { label: "Total", value: `${totalCal} kcal`, color: "text-chart-3", bg: "bg-chart-3/5" }
              ].map((stat) => (
                <div key={stat.label} className={cn("rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-2xl shadow-black/[0.02] backdrop-blur-sm", stat.bg)}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">
                    {stat.label}
                  </p>
                  <p className={cn("text-3xl font-black tracking-tighter tabular-nums", stat.color)}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="relative space-y-12">
              {/* Línea de tiempo decorativa en Desktop */}
              <div className="absolute left-[31px] top-4 bottom-4 w-px bg-gradient-to-b from-primary/30 via-border/50 to-transparent hidden sm:block" />

              {groupedMeals.map(([dateString, dayMeals]) => {
                const date = new Date(dateString);
                const dayCalories = dayMeals.reduce((s, m) => s + m.calories, 0);

                return (
                  <div key={dateString} className="relative">
                    <div className="mb-6 flex items-center justify-between sticky top-[4.5rem] z-20 py-2 bg-background/80 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none">
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
                          <motion.div
                            key={meal.id}
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
                                if (info.offset.x < -70) {
                                  setSelectedMeal(meal);
                                }
                              }}
                              type="button"
                              onClick={() => setSelectedMeal(meal)}
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
                                  {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
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
                        ))}
                      </AnimatePresence>
                    </div>
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
