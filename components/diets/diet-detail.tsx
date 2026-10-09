"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Trash2,
  CalendarPlus,
  ChefHat,
  Loader2,
  BookOpen,
} from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { dietDishImageUrl } from "@/lib/diets";
import {
  DIET_GOAL_LABEL,
  DIET_MEAL_TYPE_LABEL,
  DIET_MEAL_TYPE_ORDER,
  type Diet,
  type DietDish,
} from "@/types/diet";
import { DishTutorialDrawer } from "./dish-tutorial";
import { MealThumb } from "@/components/meal/meal-thumb";

export function DietDetailDrawer({
  diet,
  open,
  onOpenChange,
}: {
  diet: Diet | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { activeDiet, activateDiet, deactivateDiet, deleteDiet, saveMeal } =
    useAppData();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);

  if (!diet) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent />
      </Drawer>
    );
  }

  const isActive = activeDiet?.id === diet.id;
  const selectedDish: DietDish | null =
    diet.dishes.find((d) => d.id === selectedDishId) ?? null;
  const dayCount = diet.dishes.reduce((m, d) => Math.max(m, d.day ?? 0), 0);
  const isDayPlan = dayCount > 0;

  const toggleActive = async () => {
    setBusy(true);
    try {
      if (isActive) {
        await deactivateDiet();
        toast({ title: "Dieta desactivada", description: "Tus metas vuelven a tu TDEE." });
      } else {
        await activateDiet(diet);
        toast({
          title: "¡Dieta activada!",
          description: `Tu meta ahora es ${diet.targetCalories} kcal/día.`,
        });
      }
    } catch (e) {
      logger.error("toggle diet", e);
      toast({ title: "No se pudo actualizar", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const addToPlanner = async () => {
    setPlanning(true);
    try {
      const today = new Date();
      // Planes por días: cada plato va a su día (desde hoy) y a su hora.
      const plannedDateFor = (d: DietDish) => {
        if (!d.day) return today;
        const date = new Date(today);
        date.setDate(today.getDate() + d.day - 1);
        const [h, m] = (d.time ?? "13:00").split(":").map(Number);
        date.setHours(h || 13, m || 0, 0, 0);
        return date;
      };
      for (const d of diet.dishes) {
        await saveMeal(
          {
            imageUrl: d.imageUrl ?? null,
            foodName: d.name,
            calories: d.calories,
            macros: {
              protein: d.macros.protein,
              carbs: d.macros.carbs,
              fat: d.macros.fat,
              fiber: 0,
              sugar: 0,
            },
            recommendations: [],
            isPlanned: true,
          },
          { plannedDate: plannedDateFor(d) }
        );
      }
      toast({
        title: "Añadido al planificador",
        description: dayCount > 1
          ? `${diet.dishes.length} platos repartidos en los próximos ${dayCount} días.`
          : `${diet.dishes.length} platos planificados para hoy.`,
      });
    } catch (e) {
      logger.error("add diet to planner", e);
      toast({ title: "No se pudo planificar", variant: "destructive" });
    } finally {
      setPlanning(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      if (isActive) await deactivateDiet();
      await deleteDiet(diet.id);
      toast({ title: "Dieta eliminada" });
      onOpenChange(false);
    } catch (e) {
      logger.error("delete diet", e);
      toast({ title: "No se pudo eliminar", variant: "destructive" });
    } finally {
      setBusy(false);
      setDeleteConfirm(false);
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <div className="mx-auto flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden">
            <div className="relative h-40 shrink-0 overflow-hidden">
              <MealThumb
                src={diet.imageUrl ?? dietDishImageUrl(diet.name)}
                alt={diet.name}
                className="h-full w-full"
                iconClassName="h-8 w-8"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                    {DIET_GOAL_LABEL[diet.goal]}
                  </span>
                  {isActive && (
                    <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Activa
                    </span>
                  )}
                </div>
                <DrawerHeader className="p-0 text-left">
                  <DrawerTitle className="text-2xl font-bold">{diet.name}</DrawerTitle>
                </DrawerHeader>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{diet.description}</p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <MacroTile label="kcal" value={diet.targetCalories} dot="bg-primary" />
                <MacroTile label="Proteína" value={`${diet.targetMacros.protein}g`} dot="bg-protein" />
                <MacroTile label="Carbos" value={`${diet.targetMacros.carbs}g`} dot="bg-carbs" />
                <MacroTile label="Grasa" value={`${diet.targetMacros.fat}g`} dot="bg-fat" />
              </div>

              {diet.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {diet.tags.map((t, i) => (
                    <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                  variant={isActive ? "outline" : "default"}
                  className="h-11 rounded-full"
                  onClick={toggleActive}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isActive ? (
                    <Circle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {isActive ? "Desactivar" : "Activar dieta"}
                </Button>
                <Button variant="outline" className="h-11 rounded-full" onClick={addToPlanner} disabled={planning}>
                  {planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                  Añadir al plan
                </Button>
              </div>

              {/* Platos: por día (Diet Builder) o por tipo de comida */}
              {isDayPlan ? (
                <div className="mt-7">
                  {diet.plan ? (
                    <div className="mb-4 grid grid-cols-3 gap-2">
                      {[
                        { label: "Déficit", value: `${diet.plan.dailyDeficit} kcal` },
                        { label: "Ritmo", value: `${diet.plan.weeklyLossLbs} lb/sem` },
                        { label: "Meta en", value: `~${diet.plan.projectedDays} días` },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-muted/60 px-3 py-2">
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className="truncate text-sm font-semibold tabular">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div role="tablist" aria-label="Día del plan" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                    {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
                      <button
                        key={d}
                        role="tab"
                        type="button"
                        aria-selected={selectedDay === d}
                        onClick={() => setSelectedDay(d)}
                        className={cn(
                          "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                          selectedDay === d
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Día {d}
                      </button>
                    ))}
                  </div>
                  <ul className="mt-3 space-y-2">
                    {diet.dishes
                      .filter((d) => d.day === selectedDay)
                      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
                      .map((dish) => (
                        <li key={dish.id}>
                          <p className="eyebrow mb-1 tabular">
                            {dish.time ? `${dish.time} · ` : ""}
                            {dish.mealLabel ?? DIET_MEAL_TYPE_LABEL[dish.type]}
                          </p>
                          <ul>

                          <li className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5">
                            <MealThumb
                              src={dish.imageUrl ?? dietDishImageUrl(dish.name)}
                              alt={dish.name}
                              className="h-14 w-14 shrink-0 rounded-xl"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{dish.name}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground tabular">
                                <span className="font-medium text-foreground">{dish.calories} kcal</span>
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-protein" />P {dish.macros.protein}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-carbs" />C {dish.macros.carbs}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-fat" />G {dish.macros.fat}
                                </span>
                              </p>
                              {dish.tutorial ? (
                                <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                                  <BookOpen className="h-3 w-3" /> Tutorial listo
                                </span>
                              ) : null}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 rounded-full"
                              onClick={() => setSelectedDishId(dish.id)}
                              aria-label={`Cocinar ${dish.name}`}
                            >
                              <ChefHat className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Cocinar</span>
                            </Button>
                          </li>

                          </ul>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
              <div className="mt-7 space-y-6">
                {DIET_MEAL_TYPE_ORDER.map((type) => {
                  const items = diet.dishes.filter((d) => d.type === type);
                  if (items.length === 0) return null;
                  return (
                    <section key={type}>
                      <h3 className="eyebrow mb-2">{DIET_MEAL_TYPE_LABEL[type]}</h3>
                      <ul className="space-y-2">
                        {items.map((dish) => (
                          <li key={dish.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5">
                            <MealThumb
                              src={dish.imageUrl ?? dietDishImageUrl(dish.name)}
                              alt={dish.name}
                              className="h-14 w-14 shrink-0 rounded-xl"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{dish.name}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground tabular">
                                <span className="font-medium text-foreground">{dish.calories} kcal</span>
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-protein" />P {dish.macros.protein}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-carbs" />C {dish.macros.carbs}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-fat" />G {dish.macros.fat}
                                </span>
                              </p>
                              {dish.tutorial ? (
                                <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                                  <BookOpen className="h-3 w-3" /> Tutorial listo
                                </span>
                              ) : null}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 rounded-full"
                              onClick={() => setSelectedDishId(dish.id)}
                              aria-label={`Cocinar ${dish.name}`}
                            >
                              <ChefHat className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Cocinar</span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>

              )}

              <Button
                variant="ghost"
                className="mt-8 h-11 w-full rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteConfirm(true)}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar dieta
              </Button>
            </div>
          </div>

          {deleteConfirm && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 p-6">
              <div className="surface w-full max-w-sm p-6">
                <h3 className="text-lg font-semibold">¿Eliminar esta dieta?</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Se borrará con sus platos y tutoriales. No se puede deshacer.
                </p>
                <div className="mt-6 flex gap-2">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-full"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={busy}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-11 flex-1 rounded-full"
                    onClick={() => void remove()}
                    disabled={busy}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      <DishTutorialDrawer
        diet={diet}
        dish={selectedDish}
        open={selectedDishId !== null}
        onOpenChange={(o) => {
          if (!o) setSelectedDishId(null);
        }}
      />
    </>
  );
}

function MacroTile({ label, value, dot }: { label: string; value: string | number; dot: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/60 px-2 py-2.5 text-center">
      <p className="truncate font-display text-base font-semibold tabular">{value}</p>
      <p className="mt-0.5 flex items-center justify-center gap-1 truncate text-xs text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
        {label}
      </p>
    </div>
  );
}
