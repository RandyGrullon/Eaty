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
import { Sparkles, Loader2 } from "lucide-react";
import { useAppData } from "@/hooks/use-app-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { generateDietApi, generatedToNewDiet } from "@/lib/diets";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { DIET_GOAL_LABEL, dietGoalSchema, type DietGoal } from "@/types/diet";

export function GenerateDietModal({
  open,
  onOpenChange,
  onCreated,
  initialGoal,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (dietId: string) => void;
  initialGoal?: DietGoal;
}) {
  const { profile, calorieData, createDiet } = useAppData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [goal, setGoal] = useState<DietGoal>(
    initialGoal ?? profile?.fitnessGoal ?? "balanced"
  );
  const [calories, setCalories] = useState(
    calorieData?.dailyGoal ? String(calorieData.dailyGoal) : ""
  );
  const [preferences, setPreferences] = useState("");
  const [restrictions, setRestrictions] = useState(
    profile?.allergens?.join(", ") ?? ""
  );
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const generated = await generateDietApi(idToken, {
        goal: DIET_GOAL_LABEL[goal],
        calories: calories ? parseInt(calories, 10) : undefined,
        preferences: preferences.trim() || undefined,
        restrictions: restrictions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        lang: profile?.language,
      });
      const id = await createDiet(generatedToNewDiet(generated, "ai", "ready"));
      toast({
        title: "¡Dieta creada!",
        description: `${generated.dishes.length} platos generados.`,
      });
      onOpenChange(false);
      onCreated(id);
    } catch (e) {
      logger.error("generate diet", e);
      toast({
        title: "No se pudo generar la dieta",
        description: e instanceof Error ? e.message : "Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Sparkles className="h-5 w-5 text-primary" />
            Generar dieta con IA
          </DialogTitle>
          <DialogDescription>
            La IA creará un plan de un día con platos, macros e imágenes adaptado a ti.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Objetivo
            </Label>
            <div className="flex flex-wrap gap-2">
              {dietGoalSchema.options.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoal(g)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                    goal === g
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/40 bg-card/40 text-muted-foreground hover:bg-card"
                  )}
                >
                  {DIET_GOAL_LABEL[g]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Calorías/día
              </Label>
              <Input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="2000"
                className="h-11 rounded-xl border-border/40 bg-card/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Evitar
              </Label>
              <Input
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                placeholder="lactosa, frutos…"
                className="h-11 rounded-xl border-border/40 bg-card/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Preferencias (opcional)
            </Label>
            <Input
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="comida mexicana, alta en verduras…"
              className="h-11 rounded-xl border-border/40 bg-card/40"
            />
          </div>
        </div>

        <Button
          className="w-full rounded-xl font-black shadow-lg shadow-primary/20"
          onClick={generate}
          disabled={loading || !user}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {loading ? "Creando tu dieta…" : "Generar dieta"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
