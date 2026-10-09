"use client";

import { ChefHat, Clock, Flame, Leaf, ShieldAlert, Thermometer, Utensils } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { MealThumb } from "@/components/meal/meal-thumb";
import { dietDishImageUrl } from "@/lib/diets";
import { cn } from "@/lib/utils";
import type { PlannedMeal } from "@/lib/diet-builder";

const MACROS = [
  { key: "kcal", label: "Calorías", unit: "kcal", tone: "bg-primary/10 text-primary" },
  { key: "protein", label: "Proteína", unit: "g", tone: "bg-protein/12 text-protein" },
  { key: "fat", label: "Grasa", unit: "g", tone: "bg-fat/12 text-fat" },
  { key: "netCarbs", label: "Carb. netos", unit: "g", tone: "bg-carbs/15 text-carbs" },
] as const;

/** Detalle de una receta del plan: gramos, macros y tutorial paso a paso. */
export function RecipeDetail({ meal, onOpenChange }: { meal: PlannedMeal | null; onOpenChange: (o: boolean) => void }) {
  const recipe = meal?.recipe;
  return (
    <Drawer open={Boolean(meal)} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        {recipe && meal ? (
          <div className="mx-auto w-full max-w-2xl overflow-y-auto px-4 pb-10">
            <DrawerHeader className="px-0 text-left">
              <p className="eyebrow tabular">
                {meal.time} · {meal.label}
              </p>
              <DrawerTitle className="font-display text-2xl leading-tight">{recipe.name}</DrawerTitle>
              <DrawerDescription className="flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {recipe.prepMinutes + recipe.cookMinutes} min
                </span>
                <span className="inline-flex items-center gap-1">
                  <Utensils className="h-3.5 w-3.5" /> {recipe.steps.length} pasos
                </span>
                <span className="inline-flex items-center gap-1">
                  <ChefHat className="h-3.5 w-3.5" /> 1 ración
                </span>
              </DrawerDescription>
            </DrawerHeader>

            <MealThumb src={dietDishImageUrl(recipe.name)} alt={recipe.name} className="aspect-[16/9] w-full rounded-2xl" />

            {/* Macros */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {MACROS.map((m) => (
                <div key={m.key} className={cn("rounded-xl px-2.5 py-2 text-center", m.tone)}>
                  <p className="font-display text-xl font-bold tabular">{recipe.nutrition[m.key]}</p>
                  <p className="text-[11px] leading-tight opacity-80">
                    {m.unit === "g" ? "g " : ""}
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular">
              Objetivo de esta comida: {meal.target.kcal} kcal · {meal.target.protein} g de proteína
            </p>

            {/* Ingredientes */}
            <section className="mt-6">
              <h3 className="text-base font-semibold">Ingredientes (peso en crudo)</h3>
              <ul className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card">
                {recipe.ingredients.map((i) => (
                  <li key={i.ingredientId} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground tabular">
                        {i.nutrition.kcal} kcal · P {i.nutrition.protein} · G {i.nutrition.fat} · C {i.nutrition.netCarbs}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-lg font-semibold tabular">{i.grams} g</p>
                      {i.household ? <p className="text-xs text-muted-foreground">{i.household}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Sazón */}
            <section className="mt-5">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Leaf className="h-4 w-4 text-primary" /> Sazón permitido (≈ 0 kcal)
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recipe.seasoning.map((s) => (
                  <span key={s} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                    {s}
                  </span>
                ))}
              </div>
            </section>

            {/* Pasos */}
            <section className="mt-6">
              <h3 className="text-base font-semibold">Preparación paso a paso</h3>
              <ol className="mt-3 space-y-3">
                {recipe.steps.map((s) => (
                  <li key={s.n} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular">
                      {s.n}
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{s.title}</p>
                        {s.minutes ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular">
                            <Clock className="h-3 w-3" /> {s.minutes} min
                          </span>
                        ) : null}
                        {s.tempC ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-protein/12 px-2 py-0.5 text-xs text-protein tabular">
                            <Thermometer className="h-3 w-3" /> {s.tempC} °C
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
                      {s.tip ? (
                        <p className="mt-2 flex items-start gap-1.5 text-xs text-primary">
                          <Flame className="mt-0.5 h-3 w-3 shrink-0" /> {s.tip}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* Calorías ocultas */}
            <section className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldAlert className="h-4 w-4" /> Evita calorías ocultas
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {recipe.hiddenCalorieTips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>

            <p className="mt-5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Emplatado: </span>
              {recipe.plating}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Equipo: {recipe.equipment.join(", ")}.</p>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
