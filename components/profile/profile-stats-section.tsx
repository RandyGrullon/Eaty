"use client";

import {
  Calendar as CalendarIcon,
  TrendingUp,
  Target,
  Flame,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MealCalendar } from "./meal-calendar";
import { PERIOD_OPTIONS } from "@/hooks/use-profile-stats";
import type { ProfileStats, TimePeriod } from "@/hooks/use-profile-stats";
import type { UserProfile } from "@/types/meal";


interface ProfileStatsSectionProps {
  stats: ProfileStats;
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  userProfile?: UserProfile | null;
}

export function ProfileStatsSection({
  stats,
  selectedPeriod,
  onPeriodChange,
  userProfile,
}: ProfileStatsSectionProps) {
  let periodDays = 7;
  if (selectedPeriod === "daily") periodDays = 1;
  else if (selectedPeriod === "weekly") periodDays = 7;
  else if (selectedPeriod === "monthly") periodDays = 30;
  else if (selectedPeriod === "quarterly") periodDays = 90;
  else if (selectedPeriod === "semi-annual") periodDays = 180;
  else if (selectedPeriod === "annual") periodDays = 365;

  const proteinTarget = ((userProfile?.customGoals?.protein || 70) * periodDays) || 1;
  const carbsTarget = ((userProfile?.customGoals?.carbs || 220) * periodDays) || 1;
  const fatTarget = ((userProfile?.customGoals?.fat || 65) * periodDays) || 1;
  const fiberTarget = (25 * periodDays) || 1;
  const sugarTarget = (35 * periodDays) || 1;

  const pctOf = (value: number, target: number) => (value / target) * 100;

  const statTiles = [
    { label: "Comidas", value: stats.totalMeals.toLocaleString("es-ES"), icon: Target },
    { label: "Kcal media", value: stats.averageCalories.toLocaleString("es-ES"), icon: TrendingUp },
    { label: "Kcal totales", value: stats.totalCalories.toLocaleString("es-ES"), icon: Flame },
    { label: "En el período", value: stats.weeklyMeals.toLocaleString("es-ES"), icon: CalendarIcon },
  ];

  const macroRows = [
    { label: "Proteína", value: stats.totalProtein, dot: "bg-protein", bar: "bg-protein", track: "bg-protein/15", pct: pctOf(stats.totalProtein, proteinTarget) },
    { label: "Carbohidratos", value: stats.totalCarbs, dot: "bg-carbs", bar: "bg-carbs", track: "bg-carbs/20", pct: pctOf(stats.totalCarbs, carbsTarget) },
    { label: "Grasa", value: stats.totalFat, dot: "bg-fat", bar: "bg-fat", track: "bg-fat/15", pct: pctOf(stats.totalFat, fatTarget) },
    { label: "Fibra", value: stats.totalFiber, dot: "bg-primary", bar: "bg-primary", track: "bg-primary/15", pct: pctOf(stats.totalFiber, fiberTarget) },
    { label: "Azúcar", value: stats.totalSugar, dot: "bg-chart-5", bar: "bg-chart-5", track: "bg-muted", pct: pctOf(stats.totalSugar, sugarTarget) },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Estadísticas</h2>
        <div className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              aria-pressed={selectedPeriod === value}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                selectedPeriod === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-12">
          {statTiles.map((stat) => (
            <div key={stat.label} className="surface min-w-0 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="h-4 w-4" />
              </span>
              <p className="mt-3 truncate font-display text-2xl font-bold tabular">{stat.value}</p>
              <p className="eyebrow mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5">
          <div className="surface h-full p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Acumulado
            </h3>
            <p className="text-sm text-muted-foreground">Respecto a tu meta del período</p>
            <div className="mt-4 space-y-4">
              {macroRows.map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <span className={cn("h-2 w-2 rounded-full", row.dot)} aria-hidden />
                      {row.label}
                    </span>
                    <span className="tabular text-muted-foreground">
                      <span className="font-semibold text-foreground">{Math.round(row.value)} g</span> ·{" "}
                      {Math.round(row.pct)}%
                    </span>
                  </div>
                  <div className={cn("h-2 overflow-hidden rounded-full", row.track)}>
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", row.bar)}
                      style={{ width: `${Math.min(100, row.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <MealCalendar />
        </div>
      </div>
    </section>
  );
}
