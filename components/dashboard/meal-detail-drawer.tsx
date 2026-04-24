"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuth } from "@/hooks/use-auth";
import { updateMeal } from "@/lib/meals";
import { db } from "@/lib/firebase";
import type { Meal } from "@/types/meal";
import { doc, deleteDoc } from "firebase/firestore";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type MealDetailDrawerProps = {
  meal: Meal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMealUpdated: () => void;
};

export function MealDetailDrawer({
  meal,
  open,
  onOpenChange,
  onMealUpdated,
}: MealDetailDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sugar, setSugar] = useState("");
  const [recommendationsText, setRecommendationsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!meal) return;
    setFoodName(meal.foodName);
    setCalories(String(meal.calories));
    setProtein(String(meal.macros.protein));
    setCarbs(String(meal.macros.carbs));
    setFat(String(meal.macros.fat));
    setFiber(String(meal.macros.fiber));
    setSugar(String(meal.macros.sugar));
    setRecommendationsText(meal.recommendations.join("\n"));
  }, [meal]);

  const handleSave = async () => {
    if (!user || !meal) return;

    const cals = Math.round(parseFloat(calories) || 0);
    const round1 = (v: string) =>
      Math.round((parseFloat(v) || 0) * 10) / 10;
    const p = round1(protein);
    const c = round1(carbs);
    const f = round1(fat);
    const fi = round1(fiber);
    const su = round1(sugar);

    if (!foodName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Indica el nombre del plato.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await updateMeal(user.uid, meal.id, {
        foodName: foodName.trim(),
        calories: cals,
        macros: {
          protein: p,
          carbs: c,
          fat: f,
          fiber: fi,
          sugar: su,
        },
        recommendations: recommendationsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        imageUrl: meal.imageUrl,
      });
      toast({ title: "Guardado", description: "Los cambios se aplicaron." });
      onMealUpdated();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo guardar la comida.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !meal) return;
    if (!confirm("¿Eliminar esta comida del historial?")) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "meals", meal.id));
      toast({ title: "Eliminada", description: "La comida se quitó del historial." });
      onMealUpdated();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo eliminar.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal>
      <DrawerContent
        className={cn(
          "mt-10 max-h-[min(58vh,560px)] border-t bg-background px-0 pb-6 pt-2",
          "data-[vaul-drawer-direction=bottom]:mt-10 data-[vaul-drawer-direction=bottom]:max-h-[min(58vh,560px)]"
        )}
      >
        {meal ? (
          <>
            <DrawerHeader className="border-b border-border/60 px-4 pb-3 text-left">
              <DrawerTitle className="text-lg">Detalle de comida</DrawerTitle>
              <p className="text-xs text-muted-foreground">
                {meal.createdAt.toLocaleString("es-ES", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </DrawerHeader>

            <div className="flex max-h-[calc(min(58vh,560px)-8rem)] flex-col gap-4 overflow-y-auto px-4 py-3">
              {meal.imageUrl ? (
                <div className="mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={meal.imageUrl}
                    alt=""
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  Sin imagen guardada
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="meal-name">Nombre</Label>
                <Input
                  id="meal-name"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meal-cal">Calorías (kcal)</Label>
                <Input
                  id="meal-cal"
                  type="number"
                  min={0}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="meal-p" className="text-xs">
                    Proteína (g)
                  </Label>
                  <Input
                    id="meal-p"
                    type="number"
                    min={0}
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="h-9 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meal-c" className="text-xs">
                    Carbos (g)
                  </Label>
                  <Input
                    id="meal-c"
                    type="number"
                    min={0}
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="h-9 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meal-f" className="text-xs">
                    Grasa (g)
                  </Label>
                  <Input
                    id="meal-f"
                    type="number"
                    min={0}
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="h-9 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meal-fi" className="text-xs">
                    Fibra (g)
                  </Label>
                  <Input
                    id="meal-fi"
                    type="number"
                    min={0}
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    className="h-9 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meal-s" className="text-xs">
                    Azúcar (g)
                  </Label>
                  <Input
                    id="meal-s"
                    type="number"
                    min={0}
                    value={sugar}
                    onChange={(e) => setSugar(e.target.value)}
                    className="h-9 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meal-rec">Recomendaciones (una por línea)</Label>
                <Textarea
                  id="meal-rec"
                  rows={4}
                  value={recommendationsText}
                  onChange={(e) => setRecommendationsText(e.target.value)}
                  className="resize-none rounded-lg text-sm"
                />
              </div>
            </div>

            <DrawerFooter className="flex-row flex-wrap gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1.5"
                disabled={deleting || saving}
                onClick={handleDelete}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" size="sm">
                  Cerrar
                </Button>
              </DrawerClose>
              <Button
                type="button"
                size="sm"
                className="ml-auto"
                disabled={saving || deleting}
                onClick={handleSave}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
