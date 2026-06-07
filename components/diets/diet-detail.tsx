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
  Flame,
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
          { plannedDate: today }
        );
      }
      toast({
        title: "Añadido al planificador",
        description: `${diet.dishes.length} platos planificados para hoy.`,
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={diet.imageUrl ?? dietDishImageUrl(diet.name)}
                alt={diet.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary-foreground">
                    {DIET_GOAL_LABEL[diet.goal]}
                  </span>
                  {isActive && (
                    <span className="flex items-center gap-1 rounded-full bg-chart-2 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                      <CheckCircle2 className="h-3 w-3" /> Activa
                    </span>
                  )}
                </div>
                <DrawerHeader className="p-0 text-left">
                  <DrawerTitle className="text-2xl font-black tracking-tight">
                    {diet.name}
                  </DrawerTitle>
                </DrawerHeader>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {diet.description}
              </p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <MacroTile label="Kcal" value={diet.targetCalories} tone="text-primary" />
                <MacroTile label="Prot" value={`${diet.targetMacros.protein}g`} tone="text-chart-1" />
                <MacroTile label="Carb" value={`${diet.targetMacros.carbs}g`} tone="text-chart-2" />
                <MacroTile label="Grasa" value={`${diet.targetMacros.fat}g`} tone="text-chart-4" />
              </div>

              {diet.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {diet.tags.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-border/40 bg-card/50 px-3 py-1 text-[11px] font-bold text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Acciones */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button
                  className={cn(
                    "rounded-xl font-black",
                    isActive
                      ? "bg-muted text-foreground hover:bg-muted/80"
                      : "shadow-lg shadow-primary/20"
                  )}
                  onClick={toggleActive}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : isActive ? (
                    <Circle className="mr-2 h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  {isActive ? "Desactivar" : "Activar dieta"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl font-bold"
                  onClick={addToPlanner}
                  disabled={planning}
                >
                  {planning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarPlus className="mr-2 h-4 w-4" />
                  )}
                  Añadir al plan
                </Button>
              </div>

              {/* Platos por tipo */}
              <div className="mt-7 space-y-6">
                {DIET_MEAL_TYPE_ORDER.map((type) => {
                  const items = diet.dishes.filter((d) => d.type === type);
                  if (items.length === 0) return null;
                  return (
                    <section key={type}>
                      <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                        {DIET_MEAL_TYPE_LABEL[type]}
                      </h3>
                      <div className="space-y-3">
                        {items.map((dish) => (
                          <div
                            key={dish.id}
                            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/40 p-3"
                          >
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={dish.imageUrl ?? dietDishImageUrl(dish.name)}
                                alt={dish.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-foreground">
                                {dish.name}
                              </p>
                              <p className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                                <Flame className="h-3 w-3 text-primary" />
                                {dish.calories} kcal · P{dish.macros.protein} C
                                {dish.macros.carbs} G{dish.macros.fat}
                              </p>
                              {dish.tutorial ? (
                                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-chart-2">
                                  <BookOpen className="h-3 w-3" /> Tutorial listo
                                </span>
                              ) : null}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 gap-1.5 rounded-xl font-bold"
                              onClick={() => setSelectedDishId(dish.id)}
                            >
                              <ChefHat className="h-3.5 w-3.5" />
                              Cocinar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

              <Button
                variant="ghost"
                className="mt-8 w-full gap-2 rounded-xl text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteConfirm(true)}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar dieta
              </Button>
            </div>
          </div>

          {deleteConfirm && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-3xl border border-border/40 bg-card p-6 shadow-2xl">
                <h3 className="text-lg font-black text-foreground">
                  ¿Eliminar esta dieta?
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Se borrará junto con sus platos y tutoriales. No se puede deshacer.
                </p>
                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl font-bold"
                    onClick={() => setDeleteConfirm(false)}
                    disabled={busy}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-xl font-black"
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

function MacroTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-2.5 text-center">
      <p className={cn("text-base font-black tabular-nums", tone)}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </p>
    </div>
  );
}
