"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const statTiles = [
    { label: "Comidas", value: stats.totalMeals, icon: Target, color: "text-chart-1", bg: "bg-chart-1/10" },
    { label: "Kcal Media", value: stats.averageCalories, icon: TrendingUp, color: "text-chart-3", bg: "bg-chart-3/10" },
    { label: "Kcal Totales", value: stats.totalCalories.toLocaleString(), icon: Flame, color: "text-primary", bg: "bg-primary/10" },
    { label: "En Período", value: stats.weeklyMeals, icon: CalendarIcon, color: "text-chart-2", bg: "bg-chart-2/10" },
  ];

  const macroRows = [
    { label: "Proteína", value: stats.totalProtein, unit: "g", color: "bg-chart-1", percentage: Math.min(100, (stats.totalProtein / proteinTarget) * 100), displayPct: Math.round((stats.totalProtein / proteinTarget) * 100) },
    { label: "Carbos", value: stats.totalCarbs, unit: "g", color: "bg-chart-2", percentage: Math.min(100, (stats.totalCarbs / carbsTarget) * 100), displayPct: Math.round((stats.totalCarbs / carbsTarget) * 100) },
    { label: "Grasas", value: stats.totalFat, unit: "g", color: "bg-chart-4", percentage: Math.min(100, (stats.totalFat / fatTarget) * 100), displayPct: Math.round((stats.totalFat / fatTarget) * 100) },
    { label: "Fibra", value: stats.totalFiber, unit: "g", color: "bg-chart-3", percentage: Math.min(100, (stats.totalFiber / fiberTarget) * 100), displayPct: Math.round((stats.totalFiber / fiberTarget) * 100) },
    { label: "Azúcar", value: stats.totalSugar, unit: "g", color: "bg-chart-5", percentage: Math.min(100, (stats.totalSugar / sugarTarget) * 100), displayPct: Math.round((stats.totalSugar / sugarTarget) * 100) },
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black tracking-tight text-foreground">Estadísticas</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPeriodChange(value)}
              aria-pressed={selectedPeriod === value}
              className={cn(
                "shrink-0 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all",
                selectedPeriod === value
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card/40 text-muted-foreground border border-border/40 hover:bg-card hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statTiles.map((stat) => (
            <div key={stat.label} className="rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-xl shadow-black/[0.02] backdrop-blur-sm transition-transform hover:-translate-y-1">
              <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-2xl", stat.bg, stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-3xl font-black tabular-nums tracking-tighter">{stat.value}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5">
          <Card className="rounded-[2.5rem] border border-border/40 bg-card/40 shadow-xl shadow-black/[0.02] backdrop-blur-sm overflow-hidden h-full">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Acumulado
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              {macroRows.map((row) => (
                <div key={row.label} className="group">
                  <div className="flex justify-between items-end mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{row.label}</span>
                    <span className="text-sm font-black tabular-nums">
                      {Math.round(row.value)}{row.unit}
                      <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">({row.displayPct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted shadow-inner overflow-hidden">
                    <div className={cn("h-full rounded-full opacity-70 transition-all duration-500", row.color)} style={{ width: `${row.percentage}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <MealCalendar />
        </div>
      </div>
    </section>
  );
}
