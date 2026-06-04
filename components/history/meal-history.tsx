"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CalendarDays,
  Calendar as CalendarIcon,
  UtensilsCrossed,
  Download,
  FileText,
  Loader2,
  Search,
  Filter,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getUserMeals } from "@/lib/meals";
import type { Meal } from "@/types/meal";
import { MealDetailModal } from "./meal-detail-modal";
import { MealTimelineGroup } from "./meal-timeline-group";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useMealFilters, type FilterPeriod } from "@/hooks/use-meal-filters";
import { exportMealsJson, exportMealsCsv } from "@/lib/meal-export";

interface MealHistoryProps {
  onBack: () => void;
}

const CALORIE_RANGES = [
  { id: "all", label: "Cualquiera" },
  { id: "low", label: "< 200 kcal" },
  { id: "mid", label: "200-500 kcal" },
  { id: "high", label: "> 500 kcal" },
] as const;

function getFilterIcon(period: FilterPeriod) {
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
}

function getFilterLabel(period: FilterPeriod): string {
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
}

function groupMealsByDate(list: Meal[]): [string, Meal[]][] {
  const groups: { [key: string]: Meal[] } = {};
  list.forEach((meal) => {
    const dateKey = meal.createdAt.toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(meal);
  });
  return Object.entries(groups).sort(
    ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
  );
}

export function MealHistory({ onBack }: MealHistoryProps) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const {
    period: filterPeriod,
    setPeriod: setFilterPeriod,
    query: searchQuery,
    setQuery: setSearchQuery,
    calorieRange,
    setCalorieRange,
    filteredMeals,
  } = useMealFilters(meals);

  const loadMeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setMeals(await getUserMeals(user.uid));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadMeals();
  }, [user, loadMeals]);

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
      <div className="hidden sm:flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 rounded-2xl border-border/40 bg-card/40 font-bold shadow-sm backdrop-blur-sm"
          onClick={() => exportMealsJson(filteredMeals, filterPeriod)}
          disabled={filteredMeals.length === 0}
        >
          <Download className="h-4 w-4" />
          JSON
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 rounded-2xl border-border/40 bg-card/40 font-bold shadow-sm backdrop-blur-sm"
          onClick={() => exportMealsCsv(filteredMeals, filterPeriod)}
          disabled={filteredMeals.length === 0}
        >
          <FileText className="h-4 w-4" />
          CSV
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="flex sm:hidden h-12 w-12 shrink-0 rounded-[1.25rem] border border-border/40 bg-card/40 shadow-sm backdrop-blur-xl hover:bg-card disabled:opacity-40"
        onClick={() => exportMealsCsv(filteredMeals, filterPeriod)}
        disabled={filteredMeals.length === 0}
        aria-label="Exportar historial (CSV)"
      >
        <Download className="h-5 w-5" />
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
  const avgCal = filteredMeals.length > 0 ? Math.round(totalCal / filteredMeals.length) : 0;

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
                placeholder="Buscar por nombre, recomendación…"
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
                  aria-pressed={filterPeriod === period}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black tracking-tight transition-all duration-300",
                    filterPeriod === period
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                      : "border-border/40 bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground"
                  )}
                >
                  {period !== "all" && getFilterIcon(period)}
                  {getFilterLabel(period)}
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
            {CALORIE_RANGES.map((range) => (
              <button
                key={range.id}
                onClick={() => setCalorieRange(range.id)}
                aria-pressed={calorieRange === range.id}
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

              {groupedMeals.map(([dateString, dayMeals]) => (
                <MealTimelineGroup
                  key={dateString}
                  dateString={dateString}
                  dayMeals={dayMeals}
                  onSelect={setSelectedMeal}
                />
              ))}
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
