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
import { encryptData, decryptData } from "@/lib/encryption";
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
      const decryptedWeight =
        typeof userProfile.weight === "string"
          ? await decryptData(userProfile.weight, userId)
          : userProfile.weight;

      const wUnit = userProfile.weightUnit || "kg";
      const weightDisplay = decryptedWeight
        ? wUnit === "lbs"
          ? Math.round(Number(decryptedWeight) * 2.20462 * 10) / 10
          : Math.round(Number(decryptedWeight) * 10) / 10
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
      const encryptedWeight = await encryptData(weightInKg.toString(), userId);

      await updateUserProfile(userId, {
        weight: encryptedWeight,
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
    <section className="pt-8 border-t border-border/40">
      <div className="rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/5 via-card/50 to-card/50 p-6 sm:p-8 shadow-xl shadow-primary/5">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h3 className="text-2xl font-black tracking-tight text-foreground">
            Registrar Progreso
          </h3>
        </div>
        <p className="mb-6 text-sm font-medium text-muted-foreground/80 max-w-lg">
          Actualiza estos datos regularmente para que los cálculos de calorías (TDEE) y tus metas de macronutrientes sigan siendo precisos.
        </p>

        <div className="grid gap-6 sm:grid-cols-3 mb-6">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Peso ({weightUnit})
            </Label>
            <div className="flex bg-card/60 rounded-xl border border-border/40">
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                step="0.1"
                min="0"
                className="flex-1 h-12 border-0 bg-transparent px-4 font-bold shadow-none focus-visible:ring-0"
              />
              <Select
                value={weightUnit}
                onValueChange={(val: "kg" | "lbs") => setWeightUnit(val)}
              >
                <SelectTrigger className="w-20 border-0 bg-transparent ring-0 shadow-none focus:ring-0 font-bold text-muted-foreground">
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
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Nivel de Actividad
            </Label>
            <Select
              value={activityLevel}
              onValueChange={setActivityLevel}
            >
              <SelectTrigger className="h-12 rounded-xl border-border/40 bg-card/60 px-4 font-bold shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentario</SelectItem>
                <SelectItem value="light">Ligero</SelectItem>
                <SelectItem value="moderate">Moderado</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="very_active">Muy Activo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Objetivo Actual
            </Label>
            <Select
              value={fitnessGoal}
              onValueChange={setFitnessGoal}
            >
              <SelectTrigger className="h-12 rounded-xl border-border/40 bg-card/60 px-4 font-bold shadow-sm">
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

        <div className="flex justify-end">
          <Button
            onClick={handleUpdate}
            disabled={saving}
            className="rounded-2xl font-black h-12 px-8 shadow-lg transition-all active:scale-95"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Actualizar Datos
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
