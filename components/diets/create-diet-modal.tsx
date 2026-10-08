"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, ChefHat } from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  processDietApi,
  generateTutorialApi,
  generatedToNewDiet,
  type NewDiet,
} from "@/lib/diets";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import {
  DIET_MEAL_TYPE_LABEL,
  DIET_MEAL_TYPE_ORDER,
  dietGoalSchema,
  DIET_GOAL_LABEL,
  type DietGoal,
  type DietMealType,
} from "@/types/diet";

interface DishRow {
  name: string;
  type: DietMealType;
  description: string;
}

export function CreateDietModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (dietId: string) => void;
}) {
  const { profile, createDiet } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState<DietGoal>(profile?.fitnessGoal ?? "balanced");
  const [dishes, setDishes] = useState<DishRow[]>([
    { name: "", type: "breakfast", description: "" },
    { name: "", type: "lunch", description: "" },
    { name: "", type: "dinner", description: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const updateDish = (i: number, patch: Partial<DishRow>) =>
    setDishes((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addDish = () =>
    setDishes((rows) => [...rows, { name: "", type: "snack", description: "" }]);
  const removeDish = (i: number) =>
    setDishes((rows) => rows.filter((_, idx) => idx !== i));

  const validDishes = dishes.filter((d) => d.name.trim());

  const save = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast({ title: "Ponle un nombre a tu dieta", variant: "destructive" });
      return;
    }
    if (validDishes.length === 0) {
      toast({ title: "Añade al menos un plato", variant: "destructive" });
      return;
    }

    setBusy(true);
    setProgress("Procesando tu dieta con la IA…");
    try {
      const idToken = await user.getIdToken();

      // 1) La IA completa macros/calorías respetando los platos del usuario.
      const processed = await processDietApi(idToken, {
        name: name.trim(),
        description: description.trim() || undefined,
        goal: DIET_GOAL_LABEL[goal],
        dishes: validDishes.map((d) => ({
          name: d.name.trim(),
          type: d.type,
          description: d.description.trim() || undefined,
        })),
        lang: profile?.language,
      });

      const newDiet: NewDiet = generatedToNewDiet(processed, "user", "draft");

      // 2) Genera el paso a paso de cada plato (al guardar, como pediste).
      for (let i = 0; i < newDiet.dishes.length; i++) {
        const dish = newDiet.dishes[i];
        setProgress(`Generando tutorial ${i + 1}/${newDiet.dishes.length}…`);
        try {
          const tutorial = await generateTutorialApi(idToken, {
            dishName: dish.name,
            description: dish.description || undefined,
            lang: profile?.language,
          });
          newDiet.dishes[i] = { ...dish, tutorial };
        } catch (e) {
          // Si un tutorial falla, seguimos: se podrá generar on-demand luego.
          logger.error("tutorial during create", e);
        }
      }

      newDiet.status = "ready";
      const id = await createDiet(newDiet);
      toast({
        title: "¡Dieta creada!",
        description: "Tus platos ya tienen su paso a paso.",
      });
      onOpenChange(false);
      resetAndClose();
      onCreated(id);
    } catch (e) {
      logger.error("create diet", e);
      toast({
        title: "No se pudo crear la dieta",
        description: e instanceof Error ? e.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const resetAndClose = () => {
    setName("");
    setDescription("");
    setDishes([
      { name: "", type: "breakfast", description: "" },
      { name: "", type: "lunch", description: "" },
      { name: "", type: "dinner", description: "" },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (busy ? null : onOpenChange(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ChefHat className="h-4 w-4" />
            </span>
            Crear mi dieta
          </DialogTitle>
          <DialogDescription>
            Añade tus platos. Al guardar, la IA calcula los macros y crea el paso a paso de cada uno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Nombre
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi semana fitness"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Descripción (opcional)
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Alta en proteína, sin azúcar…"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Objetivo
            </Label>
            <div className="flex flex-wrap gap-2">
              {dietGoalSchema.options.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoal(g)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    goal === g
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  {DIET_GOAL_LABEL[g]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Platos
            </Label>
            {dishes.map((dish, i) => (
              <div
                key={i}
                className="space-y-2 rounded-xl bg-muted/60 p-3"
              >
                <div className="flex gap-2">
                  <Input
                    value={dish.name}
                    onChange={(e) => updateDish(i, { name: e.target.value })}
                    placeholder="Nombre del plato"
                    className="h-10 min-w-0 flex-1 rounded-xl bg-card"
                  />
                  {dishes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Quitar plato"
                      onClick={() => removeDish(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DIET_MEAL_TYPE_ORDER.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateDish(i, { type: t })}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        dish.type === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {DIET_MEAL_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-full"
              onClick={addDish}
            >
              <Plus className="h-4 w-4" />
              Añadir plato
            </Button>
          </div>
        </div>

        <Button
          className="h-11 w-full rounded-full"
          onClick={save}
          disabled={busy || !user}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChefHat className="h-4 w-4" />
          )}
          {busy ? progress ?? "Guardando…" : "Guardar y generar tutoriales"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
