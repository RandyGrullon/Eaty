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
import { Loader2, Trash2, Share2, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { GenerateDishImage } from "@/components/meal/generate-dish-image";

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
          "mx-auto max-w-2xl rounded-t-[3rem] border-t border-border/40 bg-background pb-10 pt-2 shadow-2xl",
          "data-[vaul-drawer-direction=bottom]:max-h-[88vh]"
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted/40" />

        {meal ? (
          <>
            <DrawerHeader className="px-6 pb-6 pt-6 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <DrawerTitle className="text-2xl font-black tracking-tight text-foreground">
                    Editar comida
                  </DrawerTitle>
                  <p className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                    {meal.isPlanned ? (
                      <>
                        <CalendarClock className="h-3.5 w-3.5" /> Comida planificada
                      </>
                    ) : (
                      "Gestión de historial"
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className="h-10 w-10 rounded-xl text-primary hover:bg-primary/10"
                    aria-label="Compartir comida"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase leading-none tracking-widest text-muted-foreground">
                      {meal.isPlanned ? "Para el" : "Registrado"}
                    </p>
                    <p className="mt-1 text-xs font-black text-foreground">
                      {meal.createdAt.toLocaleString("es-ES", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </DrawerHeader>

            <div className="flex flex-col gap-8 overflow-y-auto px-6 pb-8">
              {imageUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-[2.5rem] border border-border/40 bg-card shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={meal.foodName}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-[2.5rem] border border-dashed border-border/60 bg-muted/30">
                  <p className="text-xs font-medium italic text-muted-foreground/60">
                    Sin imagen adjunta
                  </p>
                </div>
              )}

              <GenerateDishImage
                meal={{ foodName: foodName || meal.foodName, aiContext: meal.aiContext }}
                onUseImage={(url) => setImageUrl(url)}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="meal-name"
                    className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >
                    Nombre del plato
                  </Label>
                  <Input
                    id="meal-name"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    className="h-12 rounded-2xl border-border/40 bg-card/40 px-4 font-bold shadow-sm transition-all focus:bg-card focus:shadow-md"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="meal-cal"
                    className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                  >
                    Calorías (kcal)
                  </Label>
                  <Input
                    id="meal-cal"
                    type="number"
                    min={0}
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="h-12 rounded-2xl border-border/40 bg-card/40 px-4 font-black tabular-nums text-primary shadow-sm transition-all focus:bg-card focus:shadow-md"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
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
                    <div key={macro.id} className="group relative">
                      <Input
                        id={macro.id}
                        type="number"
                        min={0}
                        value={macro.val}
                        placeholder="0"
                        onChange={(e) => macro.set(e.target.value)}
                        className={cn(
                          "h-14 rounded-[1.25rem] border-border/40 bg-card/40 px-4 pt-6 font-black tabular-nums shadow-sm transition-all focus:bg-card focus:shadow-md",
                          macro.color
                        )}
                      />
                      <Label
                        htmlFor={macro.id}
                        className="pointer-events-none absolute left-4 top-2 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 transition-colors group-focus-within:text-primary"
                      >
                        {macro.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="meal-rec"
                  className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >
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
                className="h-14 w-14 shrink-0 rounded-2xl text-destructive transition-colors hover:bg-destructive/10"
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
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 rounded-2xl border-border/40 bg-card/20 px-6 font-bold transition-all hover:bg-card"
                >
                  Cerrar
                </Button>
              </DrawerClose>
              <Button
                type="button"
                className="h-14 flex-1 rounded-2xl px-6 font-black shadow-xl shadow-primary/20 transition-all active:scale-95"
                disabled={saving || deleting}
                onClick={requestSaveConfirm}
              >
                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DrawerFooter>

            {saveConfirmOpen && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-3xl border border-border/40 bg-card p-6 shadow-2xl">
                  <h3 className="text-lg font-black text-foreground">
                    ¿Guardar los cambios?
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Se actualizarán nombre, calorías, macros y recomendaciones de esta
                    entrada.
                  </p>
                  <div className="mt-6 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-xl font-bold"
                      onClick={() => setSaveConfirmOpen(false)}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 rounded-xl font-black"
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
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-3xl border border-border/40 bg-card p-6 shadow-2xl">
                  <h3 className="text-lg font-black text-foreground">
                    ¿Eliminar esta comida?
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Se borrará del historial. Esta acción no se puede deshacer.
                  </p>
                  <div className="mt-6 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-xl font-bold"
                      onClick={() => setDeleteOpen(false)}
                      disabled={deleting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1 rounded-xl font-black"
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
