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
import { useAppData } from "@/hooks/use-app-data";
import { Loader2, Trash2, Share2, CalendarClock, ImageOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { GenerateDishImage } from "@/components/meal/generate-dish-image";
import { MealThumb } from "@/components/meal/meal-thumb";

/** Formatea una fecha al valor de un <input type="datetime-local"> (hora local). */
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * Editor de comidas GLOBAL. Se monta una sola vez (en `app/page.tsx`) y se abre
 * desde cualquier pantalla con `useAppData().openMealEditor(meal)`. Unifica el
 * antiguo `MealDetailDrawer` (dashboard) y `MealDetailModal` (historial). Escribe
 * vía las acciones del store, así que los cambios se reflejan en vivo en toda la
 * app sin recargar.
 */
export function MealEditorDrawer() {
  const { editingMeal: meal, closeMealEditor, updateMeal, deleteMeal } =
    useAppData();
  const { toast } = useToast();

  const open = meal !== null;

  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sugar, setSugar] = useState("");
  const [recommendationsText, setRecommendationsText] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [recordedAt, setRecordedAt] = useState("");
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
    setImageUrl(meal.imageUrl);
    setRecordedAt(toDatetimeLocalValue(meal.createdAt));
    setSaving(false);
    setDeleting(false);
    setSaveConfirmOpen(false);
    setDeleteOpen(false);
  }, [meal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const requestSaveConfirm = () => {
    if (!meal) return;
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
    if (!meal) return;
    const cals = Math.round(parseFloat(calories) || 0);
    const round1 = (v: string) => Math.round((parseFloat(v) || 0) * 10) / 10;
    const parsedDate = recordedAt ? new Date(recordedAt) : null;
    const validDate =
      parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;

    if (saving) return;
    setSaveConfirmOpen(false);
    setSaving(true);
    try {
      await updateMeal(meal.id, {
        foodName: foodName.trim(),
        calories: cals,
        macros: {
          protein: round1(protein),
          carbs: round1(carbs),
          fat: round1(fat),
          fiber: round1(fiber),
          sugar: round1(sugar),
        },
        recommendations: recommendationsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        imageUrl,
        aiContext: meal.aiContext,
        createdAt: validDate,
      });
      toast({
        title: "Cambios guardados",
        description: "La comida se actualizó en tu historial.",
      });
      closeMealEditor();
    } catch (err) {
      logger.error("meal-editor save", err);
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
    if (!meal) return;
    setDeleteOpen(false);
    setDeleting(true);
    try {
      await deleteMeal(meal.id);
      toast({
        title: "Comida eliminada",
        description: "Se quitó de tu historial.",
      });
      closeMealEditor();
    } catch (err) {
      logger.error("meal-editor delete", err);
      toast({
        title: "No se pudo eliminar",
        description: "Revisa la conexión o inténtalo otra vez.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!meal) return;
    const text = `${foodName || meal.foodName} — ${
      Math.round(parseFloat(calories) || meal.calories)
    } kcal (P ${protein || meal.macros.protein}g · C ${
      carbs || meal.macros.carbs
    }g · G ${fat || meal.macros.fat}g). Analizado con Eaty.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Eaty: ${foodName || meal.foodName}`, text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copiado", description: "Resumen copiado al portapapeles." });
      }
    } catch {
      /* usuario canceló el diálogo de compartir */
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) closeMealEditor();
      }}
      modal
    >
      <DrawerContent
        className={cn(
          "mx-auto max-w-2xl rounded-t-2xl border-t border-border bg-background pb-[max(1rem,env(safe-area-inset-bottom))]",
          "data-[vaul-drawer-direction=bottom]:max-h-[88vh]"
        )}
      >
        {meal ? (
          <>
            <DrawerHeader className="px-5 pb-4 pt-4 text-left sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DrawerTitle className="text-2xl font-bold">Editar comida</DrawerTitle>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    {meal.isPlanned ? <CalendarClock className="h-4 w-4 shrink-0 text-primary" /> : null}
                    {meal.isPlanned ? "Planificada para el" : "Registrada el"}{" "}
                    <span className="tabular">
                      {meal.createdAt.toLocaleString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  className="h-10 w-10 shrink-0 rounded-full"
                  aria-label="Compartir comida"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </DrawerHeader>

            <div className="flex flex-col gap-6 overflow-y-auto px-5 pb-6 sm:px-6">
              {imageUrl ? (
                <MealThumb
                  src={imageUrl}
                  alt={meal.foodName}
                  className="aspect-video w-full rounded-2xl border border-border"
                  iconClassName="h-8 w-8"
                />
              ) : (
                <div className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/40">
                  <ImageOff className="h-6 w-6 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Sin imagen</p>
                </div>
              )}

              <GenerateDishImage
                meal={{ foodName: foodName || meal.foodName, aiContext: meal.aiContext }}
                onUseImage={(url) => setImageUrl(url)}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="meal-name" className="text-sm font-medium">
                    Nombre del plato
                  </Label>
                  <Input
                    id="meal-name"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="meal-cal" className="text-sm font-medium">
                    Calorías (kcal)
                  </Label>
                  <Input
                    id="meal-cal"
                    type="number"
                    min={0}
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="h-11 rounded-xl font-semibold tabular"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meal-date" className="text-sm font-medium">
                  Fecha y hora
                </Label>
                <Input
                  id="meal-date"
                  type="datetime-local"
                  value={recordedAt}
                  onChange={(e) => setRecordedAt(e.target.value)}
                  className="h-11 rounded-xl tabular"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Macronutrientes (g)</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "meal-p", label: "Proteína", val: protein, set: setProtein, dot: "bg-protein" },
                    { id: "meal-c", label: "Carbos", val: carbs, set: setCarbs, dot: "bg-carbs" },
                    { id: "meal-f", label: "Grasa", val: fat, set: setFat, dot: "bg-fat" },
                    { id: "meal-fi", label: "Fibra", val: fiber, set: setFiber, dot: "bg-success" },
                    { id: "meal-s", label: "Azúcar", val: sugar, set: setSugar, dot: "bg-muted-foreground" },
                  ].map((macro) => (
                    <div key={macro.id} className="relative">
                      <Input
                        id={macro.id}
                        type="number"
                        min={0}
                        value={macro.val}
                        placeholder="0"
                        onChange={(e) => macro.set(e.target.value)}
                        className="h-14 rounded-xl px-3 pt-5 font-semibold tabular"
                      />
                      <Label
                        htmlFor={macro.id}
                        className="pointer-events-none absolute left-3 top-2 flex items-center gap-1 text-xs font-normal text-muted-foreground"
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", macro.dot)} />
                        {macro.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meal-rec" className="text-sm font-medium">
                  Sugerencias de la IA
                </Label>
                <Textarea
                  id="meal-rec"
                  rows={3}
                  value={recommendationsText}
                  onChange={(e) => setRecommendationsText(e.target.value)}
                  className="resize-none rounded-xl text-sm"
                />
              </div>
            </div>

            <DrawerFooter className="flex-row items-center gap-2 border-t border-border px-5 pt-4 sm:px-6">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={deleting || saving}
                onClick={() => setDeleteOpen(true)}
                aria-label="Eliminar comida"
              >
                {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="h-11 rounded-full px-5">
                  Cerrar
                </Button>
              </DrawerClose>
              <Button
                type="button"
                className="h-11 min-w-0 flex-1 rounded-full px-5"
                disabled={saving || deleting}
                onClick={requestSaveConfirm}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </DrawerFooter>

            {saveConfirmOpen && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 p-6">
                <div className="surface w-full max-w-sm p-6">
                  <h3 className="text-lg font-semibold">¿Guardar los cambios?</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Se actualizarán nombre, calorías, macros y sugerencias de esta comida.
                  </p>
                  <div className="mt-6 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1 rounded-full"
                      onClick={() => setSaveConfirmOpen(false)}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      className="h-11 flex-1 rounded-full"
                      onClick={() => void performSave()}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {deleteOpen && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/85 p-6">
                <div className="surface w-full max-w-sm p-6">
                  <h3 className="text-lg font-semibold">¿Eliminar esta comida?</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Se borrará del historial. No se puede deshacer.
                  </p>
                  <div className="mt-6 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1 rounded-full"
                      onClick={() => setDeleteOpen(false)}
                      disabled={deleting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-11 flex-1 rounded-full"
                      onClick={() => void performDelete()}
                      disabled={deleting}
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
