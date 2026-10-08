"use client";

import { useState } from "react";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Sparkles,
  Flame,
  Beef,
  Droplets,
  Dumbbell,
  UtensilsCrossed,
  Target,
} from "lucide-react";
import type { CoachInsight } from "@/lib/coach-schema";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

function StatPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/60 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tone)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-xl font-bold tabular">{value}</p>
    </div>
  );
}

export function CoachToday() {
  const { profile, calorieData, todayMeals, activeDiet } = useAppData();
  const { user } = useAuth();
  const [insight, setInsight] = useState<CoachInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consumed = calorieData?.consumed ?? 0;
  const goal = calorieData?.dailyGoal ?? 0;
  const remainingCalories = calorieData?.remaining ?? 0;
  const remainingProtein = calorieData
    ? Math.max(
        0,
        Math.round(
          calorieData.macros.protein - calorieData.consumedMacros.protein
        )
      )
    : 0;
  const pct = goal > 0 ? Math.min(100, Math.round((consumed / goal) * 100)) : 0;

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/coach/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          context: {
            fitnessGoal: profile?.fitnessGoal,
            weightKg:
              typeof profile?.weight === "number" ? profile.weight : undefined,
            dailyGoal: goal || undefined,
            consumedToday: consumed,
            activeDietName: activeDiet?.name,
          },
          todayMeals: todayMeals.map((m) => ({
            foodName: m.foodName,
            calories: m.calories,
          })),
          remainingCalories,
          remainingProtein,
          lang: profile?.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setInsight(data.insight as CoachInsight);
    } catch (e) {
      logger.error("coach insights", e);
      setError("No se pudo generar el resumen. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-1">
      <div className="grid grid-cols-2 gap-2">
        <StatPill icon={Flame} label="Kcal restantes" value={`${remainingCalories}`} tone="bg-primary/10 text-primary" />
        <StatPill icon={Beef} label="Proteína pendiente" value={`${remainingProtein} g`} tone="bg-protein/12 text-protein" />
        <StatPill icon={Target} label="Meta cubierta" value={`${pct}%`} tone="bg-accent text-accent-foreground" />
        <StatPill
          icon={Droplets}
          label="Vasos de agua"
          value={`${calorieData?.waterGlasses ?? 0}`}
          tone="bg-water/15 text-water"
        />
      </div>

      {insight ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <h4 className="flex items-center gap-2 text-base font-semibold text-primary">
              <Sparkles className="h-4 w-4 shrink-0" />
              {insight.focusTitle}
            </h4>
            <p className="mt-1 text-sm leading-relaxed">{insight.focusMessage}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h5 className="flex items-center gap-2 text-sm font-semibold">
                <UtensilsCrossed className="h-4 w-4 shrink-0 text-primary" />
                {insight.nextMeal.title}
              </h5>
              <p className="mt-1 text-sm text-muted-foreground">{insight.nextMeal.idea}</p>
              {insight.nextMeal.approxCalories ? (
                <p className="mt-2 text-xs font-medium text-primary tabular">~{insight.nextMeal.approxCalories} kcal</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <h5 className="flex items-center gap-2 text-sm font-semibold">
                <Dumbbell className="h-4 w-4 shrink-0 text-primary" />
                {insight.training.title}
              </h5>
              <p className="mt-1 text-sm text-muted-foreground">{insight.training.idea}</p>
            </div>
          </div>

          <p className="px-1 text-center text-sm italic text-muted-foreground">“{insight.motivation}”</p>

          <Button variant="outline" className="h-10 w-full rounded-full" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Actualizar resumen
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
          <Sparkles className="mx-auto h-7 w-7 text-muted-foreground/60" />
          <p className="mt-3 font-medium">Tu resumen del día</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu foco de hoy, qué comer ahora y una sugerencia de entrenamiento.
          </p>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button className="mt-4 h-10 rounded-full" onClick={generate} disabled={loading || !user}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? "Analizando tu día…" : "Generar resumen de hoy"}
          </Button>
        </div>
      )}
    </div>
  );
}
