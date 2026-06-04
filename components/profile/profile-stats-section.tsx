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
import {
  PERIOD_OPTIONS,
  type ProfileStats,
  type TimePeriod,
} from "@/hooks/use-profile-stats";

interface ProfileStatsSectionProps {
  stats: ProfileStats;
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

export function ProfileStatsSection({
  stats,
  selectedPeriod,
  onPeriodChange,
}: ProfileStatsSectionProps) {
  const statTiles = [
    { label: "Comidas", value: stats.totalMeals, icon: Target, color: "text-chart-1", bg: "bg-chart-1/10" },
    { label: "Kcal Media", value: stats.averageCalories, icon: TrendingUp, color: "text-chart-3", bg: "bg-chart-3/10" },
    { label: "Kcal Totales", value: stats.totalCalories.toLocaleString(), icon: Flame, color: "text-primary", bg: "bg-primary/10" },
    { label: "En Período", value: stats.weeklyMeals, icon: CalendarIcon, color: "text-chart-2", bg: "bg-chart-2/10" },
  ];

  const macroRows = [
    { label: "Proteína", value: stats.totalProtein, unit: "g", color: "bg-chart-1" },
    { label: "Carbos", value: stats.totalCarbs, unit: "g", color: "bg-chart-2" },
    { label: "Grasas", value: stats.totalFat, unit: "g", color: "bg-chart-4" },
    { label: "Fibra", value: stats.totalFiber, unit: "g", color: "bg-chart-3" },
    { label: "Azúcar", value: stats.totalSugar, unit: "g", color: "bg-chart-5" },
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
                    <span className="text-sm font-black tabular-nums">{Math.round(row.value)}{row.unit}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted shadow-inner overflow-hidden">
                    <div className={cn("h-full rounded-full opacity-60", row.color)} style={{ width: "60%" }} />
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
