"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CalendarDays,
  Calendar as CalendarIcon,
  Download,
  FileText,
  Search,
  Filter,
  X,
} from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";
import type { Meal } from "@/types/meal";
import { MealTimelineGroup } from "./meal-timeline-group";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useMealFilters, type FilterPeriod } from "@/hooks/use-meal-filters";
import { exportMealsJson, exportMealsCsv } from "@/lib/meal-export";
import { PageHeader } from "@/components/app/page-header";

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
  // Datos en tiempo real desde el store global; el editor es global.
  const { meals: allMeals, loading, openMealEditor } = useAppData();
  // El historial muestra comidas ya registradas (las planificadas viven en el
  // planificador).
  const meals = allMeals.filter((m) => !m.isPlanned);

  const {
    period: filterPeriod,
    setPeriod: setFilterPeriod,
    query: searchQuery,
    setQuery: setSearchQuery,
    calorieRange,
    setCalorieRange,
    filteredMeals,
  } = useMealFilters(meals);

  const header = (
    <PageHeader
      title="Historial"
      subtitle={getFilterLabel(filterPeriod)}
      leading={
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 shrink-0 rounded-full"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      }
      badge={
        <Badge variant="secondary" className="shrink-0 rounded-full border-none bg-primary/10 px-2 py-0 text-primary tabular">
          {filteredMeals.length} registros
        </Badge>
      }
      actions={
        <>
          <div className="hidden gap-2 sm:flex">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full"
              onClick={() => exportMealsJson(filteredMeals, filterPeriod)}
              disabled={filteredMeals.length === 0}
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full"
              onClick={() => exportMealsCsv(filteredMeals, filterPeriod)}
              disabled={filteredMeals.length === 0}
            >
              <FileText className="h-4 w-4" />
              CSV
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="flex h-10 w-10 shrink-0 rounded-full sm:hidden"
            onClick={() => exportMealsCsv(filteredMeals, filterPeriod)}
            disabled={filteredMeals.length === 0}
            aria-label="Exportar historial (CSV)"
          >
            <Download className="h-4 w-4" />
          </Button>
        </>
      }
    />
  );

  if (loading) {
    return (
      <div className="min-h-full bg-background pb-32 md:pb-12">
        {header}
        <div className="mx-auto max-w-6xl space-y-3 px-4 pt-4 sm:px-6 lg:px-10">
          <div className="h-11 animate-pulse rounded-xl bg-muted" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const groupedMeals = groupMealsByDate(filteredMeals);
  const totalCal = filteredMeals.reduce((s, m) => s + m.calories, 0);
  const avgCal = filteredMeals.length > 0 ? Math.round(totalCal / filteredMeals.length) : 0;

  return (
    <div className="min-h-full bg-background pb-32 md:pb-12">
      {header}

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-4 sm:px-6 lg:px-10">
        <section className="surface space-y-4 p-4 sm:p-5">
          {/* Búsqueda y período */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o recomendación…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-xl pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Borrar búsqueda"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-full bg-muted/60 p-1 scrollbar-none">
              {(["day", "week", "month", "all"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setFilterPeriod(period)}
                  aria-pressed={filterPeriod === period}
                  className={cn(
                    "inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    filterPeriod === period
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period !== "all" && getFilterIcon(period)}
                  {getFilterLabel(period)}
                </button>
              ))}
            </div>
          </div>

          {/* Rango de calorías */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Calorías
            </span>
            {CALORIE_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => setCalorieRange(range.id)}
                aria-pressed={calorieRange === range.id}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium tabular transition-colors",
                  calorieRange === range.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </section>

        {filteredMeals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="mt-3 font-semibold">Nada por aquí</h3>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              {filterPeriod === "day"
                ? "Aún no has registrado nada hoy."
                : "No hay registros en este periodo."}
            </p>
            <Button onClick={onBack} className="mt-4 h-11 rounded-full px-6">
              Registrar una comida
            </Button>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Registros", value: String(filteredMeals.length), unit: "" },
                { label: "Promedio", value: String(avgCal), unit: "kcal" },
                { label: "Total", value: String(totalCal), unit: "kcal" },
              ].map((stat) => (
                <div key={stat.label} className="min-w-0 rounded-xl bg-muted/60 px-3 py-2.5 sm:px-4 sm:py-3">
                  <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  <dd className="truncate font-display text-xl font-semibold tabular sm:text-2xl">
                    {stat.value}
                    {stat.unit ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">{stat.unit}</span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="space-y-8">
              {groupedMeals.map(([dateString, dayMeals]) => (
                <MealTimelineGroup
                  key={dateString}
                  dateString={dateString}
                  dayMeals={dayMeals}
                  onSelect={openMealEditor}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
