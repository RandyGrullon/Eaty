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
import { appFirebase } from "@/lib/firebase";
import type { Meal } from "@/types/meal";
import { doc, deleteDoc } from "firebase/firestore";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  /** Cierre del drawer: limpia "Guardando" si se quedó colgado o se cerró durante un guardado. */
  useEffect(() => {
    if (!open) {
      setSaving(false);
      setDeleting(false);
      setSaveConfirmOpen(false);
    }
  }, [open]);

  /** Otra comida: no arrastrar estado de botones de la ficha anterior. */
  useEffect(() => {
    if (!meal) return;
    setSaving(false);
    setDeleting(false);
    setSaveConfirmOpen(false);
  }, [meal?.id]);

  const requestSaveConfirm = () => {
    if (!user || !meal) return;
    if (!foodName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Indica el nombre del plato.",
        variant: "destructive",
      });
      return;
    }
    setSaveConfirmOpen(true);
  };

  const performSave = async () => {
    if (!user || !meal) {
      return;
    }

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
    if (saving) {
      return;
    }

    setSaveConfirmOpen(false);
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
        aiContext: meal.aiContext,
      });
      toast({
        title: "Cambios guardados",
        description: "La comida se actualizó en el historial.",
      });
      onMealUpdated();
      onOpenChange(false);
    } catch (err) {
      logger.error("meal-detail-drawer save", err);
      toast({
        title: "No se pudo guardar",
        description: "Revisa la conexión o inténtalo otra vez.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async () => {
    if (!user || !meal) return;
    setDeleteOpen(false);
    setDeleting(true);
    try {
      await deleteDoc(
        doc(appFirebase.db, "users", user.uid, "meals", meal.id)
      );
      toast({
        title: "Comida eliminada",
        description: "Se quitó de tu historial.",
      });
      onMealUpdated();
      onOpenChange(false);
    } catch (err) {
      logger.error("meal-detail-drawer delete", err);
      toast({
        title: "No se pudo eliminar",
        description: "Revisa la conexión o inténtalo otra vez.",
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
          "mx-auto max-w-2xl rounded-t-[3rem] border-t border-border/40 bg-background pb-10 pt-2 shadow-2xl",
          "data-[vaul-drawer-direction=bottom]:max-h-[85vh]"
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted/40" />
        
        {meal ? (
          <>
            <DrawerHeader className="px-6 pb-6 pt-6 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <DrawerTitle className="text-2xl font-black tracking-tight text-foreground">
                    Editar Comida
                  </DrawerTitle>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-1">
                    Gestión de Historial
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                    Registrado
                  </p>
                  <p className="text-xs font-black text-foreground mt-1">
                    {meal.createdAt.toLocaleString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </DrawerHeader>

            <div className="flex flex-col gap-8 overflow-y-auto px-6 pb-8">
              {meal.imageUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-[2.5rem] border border-border/40 bg-card shadow-inner">
                  <img
                    src={meal.imageUrl}
                    alt={meal.foodName}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-[2.5rem] bg-muted/30 border border-dashed border-border/60">
                  <p className="text-xs font-medium text-muted-foreground/60 italic">Sin imagen adjunta</p>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="meal-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Nombre del Plato
                  </Label>
                  <Input
                    id="meal-name"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="h-12 rounded-2xl border-border/40 bg-card/40 px-4 font-bold shadow-sm transition-all focus:bg-card focus:shadow-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meal-cal" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Calorías (kcal)
                  </Label>
                  <Input
                    id="meal-cal"
                    type="number"
                    min={0}
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="h-12 rounded-2xl border-border/40 bg-card/40 px-4 font-black tabular-nums shadow-sm transition-all focus:bg-card focus:shadow-md text-primary"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Macronutrientes (gramos)
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "meal-p", label: "Proteína", val: protein, set: setProtein, color: "focus:ring-chart-1" },
                    { id: "meal-c", label: "Carbos", val: carbs, set: setCarbs, color: "focus:ring-chart-2" },
                    { id: "meal-f", label: "Grasa", val: fat, set: setFat, color: "focus:ring-chart-4" },
                    { id: "meal-fi", label: "Fibra", val: fiber, set: setFiber, color: "focus:ring-chart-3" },
                    { id: "meal-s", label: "Azúcar", val: sugar, set: setSugar, color: "focus:ring-chart-5" },
                  ].map((macro) => (
                    <div key={macro.id} className="relative group">
                      <Input
                        id={macro.id}
                        type="number"
                        min={0}
                        value={macro.val}
                        placeholder="0"
                        onChange={(e) => macro.set(e.target.value)}
                        className={cn(
                          "h-14 rounded-[1.25rem] border-border/40 bg-card/40 pt-6 px-4 font-black tabular-nums shadow-sm transition-all focus:bg-card focus:shadow-md",
                          macro.color
                        )}
                      />
                      <Label htmlFor={macro.id} className="absolute left-4 top-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 pointer-events-none group-focus-within:text-primary transition-colors">
                        {macro.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meal-rec" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Sugerencias (IA)
                </Label>
                <Textarea
                  id="meal-rec"
                  rows={3}
                  value={recommendationsText}
                  onChange={(e) => setRecommendationsText(e.target.value)}
                  className="resize-none rounded-[1.5rem] border-border/40 bg-card/40 p-4 text-sm font-medium shadow-sm transition-all focus:bg-card focus:shadow-md"
                />
              </div>
            </div>

            <DrawerFooter className="flex-row items-center gap-3 border-t border-border/40 px-6 pt-6">
              <Button
                type="button"
                variant="ghost"
                className="h-14 w-14 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                disabled={deleting || saving}
                onClick={() => setDeleteOpen(true)}
              >
                {deleting ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Trash2 className="h-6 w-6" />
                )}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="h-14 rounded-2xl px-6 font-bold border-border/40 bg-card/20 transition-all hover:bg-card">
                  Cerrar
                </Button>
              </DrawerClose>
              <Button
                type="button"
                className="h-14 flex-1 rounded-2xl px-6 font-black shadow-xl shadow-primary/20 transition-all active:scale-95"
                disabled={saving || deleting}
                onClick={requestSaveConfirm}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>

      <AlertDialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Guardar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizarán nombre, calorías, macros y recomendaciones de esta
              entrada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              onClick={() => {
                void performSave();
              }}
            >
              Guardar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta comida?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará del historial. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                void performDelete();
              }}
            >
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Drawer>
  );
}
