"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from "@/lib/meals";
import { parseMeasure } from "@/lib/profile-measure";
import { convertWeight } from "@/lib/unit-conversion";
import type { UserProfile } from "@/types/meal";
import { logger } from "@/lib/logger";

interface ProfileUpdateProgressProps {
  userId: string;
  userProfile: UserProfile | null;
  onSaved: () => Promise<void> | void;
}

export function ProfileUpdateProgress({
  userId,
  userProfile,
  onSaved,
}: ProfileUpdateProgressProps) {
  const { toast } = useToast();
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [activityLevel, setActivityLevel] = useState<string>("moderate");
  const [fitnessGoal, setFitnessGoal] = useState<string>("maintenance");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    let cancelled = false;
    const init = async () => {
      const weightKg = parseMeasure(userProfile.weight);

      const wUnit = userProfile.weightUnit || "kg";
      const weightDisplay = weightKg
        ? wUnit === "lbs"
          ? Math.round(weightKg * 2.20462 * 10) / 10
          : Math.round(weightKg * 10) / 10
        : "";

      if (!cancelled) {
        setWeight(weightDisplay.toString());
        setWeightUnit(wUnit);
        setActivityLevel(userProfile.activityLevel || "moderate");
        setFitnessGoal(userProfile.fitnessGoal || "maintenance");
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [userProfile, userId]);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const weightValue = parseFloat(weight) || 0;
      const weightInKg = convertWeight(weightValue, weightUnit, "kg");

      await updateUserProfile(userId, {
        weight: weightInKg > 0 ? weightInKg : undefined,
        weightUnit,
        activityLevel: activityLevel as UserProfile["activityLevel"],
        fitnessGoal: fitnessGoal as UserProfile["fitnessGoal"],
      });

      await onSaved();
      toast({
        title: "Progreso actualizado",
        description: "Tus datos y calorías diarias se han recalculado.",
      });
    } catch (error) {
      logger.error("Error updating progress", error);
      toast({
        title: "Error al guardar",
        description: "Inténtalo nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!userProfile) return null;

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TrendingUp className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Registrar progreso</h3>
          <p className="max-w-lg text-sm text-muted-foreground">
            Actualiza estos datos con regularidad para que tu gasto diario y tus metas de macros sigan siendo precisos.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="progress-weight" className="font-medium">
            Peso ({weightUnit})
          </Label>
          <div className="flex h-11 items-center rounded-xl border border-input bg-background">
            <Input
              id="progress-weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              step="0.1"
              min="0"
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 tabular shadow-none focus-visible:ring-0"
            />
            <Select value={weightUnit} onValueChange={(val: "kg" | "lbs") => setWeightUnit(val)}>
              <SelectTrigger
                aria-label="Unidad de peso"
                className="w-20 border-0 bg-transparent text-muted-foreground shadow-none focus:ring-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lbs">lbs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-medium">Nivel de actividad</Label>
          <Select value={activityLevel} onValueChange={setActivityLevel}>
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentario</SelectItem>
              <SelectItem value="light">Ligero</SelectItem>
              <SelectItem value="moderate">Moderado</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="very_active">Muy activo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="font-medium">Objetivo actual</Label>
          <Select value={fitnessGoal} onValueChange={setFitnessGoal}>
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shedding">Perder peso</SelectItem>
              <SelectItem value="maintenance">Mantener peso</SelectItem>
              <SelectItem value="bulking">Ganar masa muscular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={handleUpdate} disabled={saving} className="h-11 w-full gap-2 rounded-full px-6 sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando…" : "Actualizar datos"}
        </Button>
      </div>
    </section>
  );
}
