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
    <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", tone)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
          {label}
        </span>
      </div>
      <p className="text-2xl font-black tabular-nums tracking-tight">{value}</p>
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
    <div className="space-y-5 p-1">
      <div className="grid grid-cols-2 gap-3">
        <StatPill
          icon={Flame}
          label="Restantes"
          value={`${remainingCalories}`}
          tone="bg-primary/10 text-primary"
        />
        <StatPill
          icon={Beef}
          label="Proteína falta"
          value={`${remainingProtein} g`}
          tone="bg-chart-1/10 text-chart-1"
        />
        <StatPill
          icon={Target}
          label="Meta cubierta"
          value={`${pct}%`}
          tone="bg-chart-2/10 text-chart-2"
        />
        <StatPill
          icon={Droplets}
          label="Hidratación"
          value={`${calorieData?.waterGlasses ?? 0}`}
          tone="bg-chart-3/10 text-chart-3"
        />
      </div>

      {insight ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="mb-1 flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <h4 className="text-sm font-black uppercase tracking-wide">
                {insight.focusTitle}
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {insight.focusMessage}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-chart-2" />
                <h5 className="text-xs font-black uppercase tracking-wide text-foreground">
                  {insight.nextMeal.title}
                </h5>
              </div>
              <p className="text-sm text-muted-foreground">{insight.nextMeal.idea}</p>
              {insight.nextMeal.approxCalories ? (
                <p className="mt-2 text-[11px] font-bold text-primary">
                  ~{insight.nextMeal.approxCalories} kcal
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-chart-4" />
                <h5 className="text-xs font-black uppercase tracking-wide text-foreground">
                  {insight.training.title}
                </h5>
              </div>
              <p className="text-sm text-muted-foreground">{insight.training.idea}</p>
            </div>
          </div>

          <p className="px-1 text-center text-sm font-bold italic text-primary">
            “{insight.motivation}”
          </p>

          <Button
            variant="outline"
            className="w-full rounded-xl font-bold"
            onClick={generate}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Actualizar resumen
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 p-6 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary/50" />
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Genera un resumen personalizado con tu foco del día, qué comer ahora y
            una sugerencia de entrenamiento.
          </p>
          {error ? (
            <p className="mb-3 text-xs font-bold text-destructive">{error}</p>
          ) : null}
          <Button
            className="rounded-xl font-black shadow-lg shadow-primary/20"
            onClick={generate}
            disabled={loading || !user}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {loading ? "Analizando tu día…" : "Generar resumen de hoy"}
          </Button>
        </div>
      )}
    </div>
  );
}
