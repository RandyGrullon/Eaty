"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { format, isAfter, isBefore, startOfDay, subYears } from "date-fns";
import { es as esLocale } from "date-fns/locale";
import { parseMeasure } from "@/lib/profile-measure";
import {
  calculateAgeFromBirthDateString,
  formatDateOnlyLocal,
} from "@/lib/age-from-birthdate";
import { convertWeight, convertHeight } from "@/lib/unit-conversion";
import { isRadixPortalLayerTarget } from "@/lib/radix-utils";
import { updateUserProfile } from "@/lib/meals";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import type { UserProfile } from "@/types/meal";

type EditData = {
  birthDate: Date | undefined;
  gender: "male" | "female" | "other";
  weight: string;
  weightUnit: "kg" | "lbs";
  height: string;
  heightUnit: "cm" | "inches";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  fitnessGoal: "bulking" | "shedding" | "maintenance";
  language: string;
};

const DEFAULT_EDIT_DATA: EditData = {
  birthDate: undefined,
  gender: "male",
  weight: "",
  weightUnit: "kg",
  height: "",
  heightUnit: "cm",
  activityLevel: "moderate",
  fitnessGoal: "maintenance",
  language: "es",
};

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userProfile: UserProfile | null;
  onSaved: () => Promise<void> | void;
}

export function ProfileEditModal({
  open,
  onOpenChange,
  userId,
  userProfile,
  onSaved,
}: ProfileEditModalProps) {
  const { toast } = useToast();
  const [editData, setEditData] = useState<EditData>(DEFAULT_EDIT_DATA);
  const [saving, setSaving] = useState(false);

  // Inicializa el formulario desde el perfil cuando se abre (peso en kg, altura en cm).
  useEffect(() => {
    if (!open || !userProfile) return;

    let cancelled = false;
    const init = async () => {
      const weightKg = parseMeasure(userProfile.weight);
      const heightCm = parseMeasure(userProfile.height);

      const weightUnit = userProfile.weightUnit || "kg";
      const heightUnit = userProfile.heightUnit || "cm";

      const weightDisplay = weightKg
        ? weightUnit === "lbs"
          ? Math.round(weightKg * 2.20462)
          : weightKg
        : "";

      const heightDisplay = heightCm
        ? heightUnit === "inches"
          ? Math.round(heightCm / 2.54)
          : heightCm
        : "";

      if (cancelled) return;
      setEditData({
        birthDate: userProfile.birthDate
          ? new Date(userProfile.birthDate)
          : undefined,
        gender: userProfile.gender || "male",
        weight: weightDisplay.toString(),
        weightUnit,
        height: heightDisplay.toString(),
        heightUnit,
        activityLevel: userProfile.activityLevel || "moderate",
        fitnessGoal: userProfile.fitnessGoal || "maintenance",
        language: userProfile.language || "es",
      });
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [open, userProfile, userId]);

  const handleWeightUnitChange = (newUnit: "kg" | "lbs") => {
    const currentValue = parseFloat(editData.weight) || 0;
    if (currentValue <= 0) {
      setEditData((prev) => ({ ...prev, weightUnit: newUnit }));
      return;
    }
    const converted = convertWeight(currentValue, editData.weightUnit, newUnit);
    setEditData((prev) => ({
      ...prev,
      weight: converted.toString(),
      weightUnit: newUnit,
    }));
  };

  const handleHeightUnitChange = (newUnit: "cm" | "inches") => {
    const currentValue = parseFloat(editData.height) || 0;
    if (currentValue <= 0) {
      setEditData((prev) => ({ ...prev, heightUnit: newUnit }));
      return;
    }
    const converted = convertHeight(currentValue, editData.heightUnit, newUnit);
    setEditData((prev) => ({
      ...prev,
      height: converted.toString(),
      heightUnit: newUnit,
    }));
  };

  const handleSave = async () => {
    if (!editData.birthDate) {
      toast({
        title: "Fecha de nacimiento",
        description: "Selecciona tu fecha de nacimiento.",
        variant: "destructive",
      });
      return;
    }

    const birthIso = formatDateOnlyLocal(editData.birthDate);
    const computedAge = calculateAgeFromBirthDateString(birthIso);
    if (computedAge === null || computedAge < 13 || computedAge > 120) {
      toast({
        title: "Fecha no válida",
        description: "La edad debe estar entre 13 y 120 años.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const weightValue = parseFloat(editData.weight) || 0;
      const heightValue = parseFloat(editData.height) || 0;
      const weightInKg = convertWeight(weightValue, editData.weightUnit, "kg");
      const heightInCm = convertHeight(heightValue, editData.heightUnit, "cm");

      await updateUserProfile(userId, {
        birthDate: birthIso,
        age: computedAge,
        gender: editData.gender,
        weight: weightInKg > 0 ? weightInKg : undefined,
        height: heightInCm > 0 ? heightInCm : undefined,
        weightUnit: editData.weightUnit,
        heightUnit: editData.heightUnit,
        activityLevel: editData.activityLevel,
        fitnessGoal: editData.fitnessGoal,
        language: editData.language,
      });

      await onSaved();
      onOpenChange(false);
      toast({
        title: "Perfil actualizado",
        description: "Tus datos se han guardado correctamente.",
      });
    } catch (error) {
      logger.error("Error updating profile", error);
    } finally {
      setSaving(false);
    }
  };

  const preventPortalClose = (event: { target: EventTarget | null; preventDefault: () => void }) => {
    if (isRadixPortalLayerTarget(event.target)) {
      event.preventDefault();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg"
        onInteractOutside={preventPortalClose}
        onPointerDownOutside={preventPortalClose}
        onFocusOutside={preventPortalClose}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Editar perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Fecha de nacimiento</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Elige el día en el calendario.
            </p>
            <div className="mt-2 max-h-[min(340px,45vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card p-2">
              <Calendar
                mode="single"
                locale={esLocale}
                selected={editData.birthDate}
                defaultMonth={editData.birthDate ?? subYears(new Date(), 25)}
                onSelect={(d) =>
                  setEditData((prev) => ({
                    ...prev,
                    birthDate: d ?? prev.birthDate,
                  }))
                }
                disabled={(date) => {
                  const d = startOfDay(date);
                  const todayStart = startOfDay(new Date());
                  const youngestBirth = startOfDay(subYears(todayStart, 13));
                  const oldestBirth = startOfDay(subYears(todayStart, 120));
                  return isAfter(d, youngestBirth) || isBefore(d, oldestBirth);
                }}
                captionLayout="dropdown"
                fromYear={new Date().getFullYear() - 120}
                toYear={new Date().getFullYear() - 13}
                className="mx-auto w-fit"
              />
            </div>
            {editData.birthDate ? (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {format(editData.birthDate, "PPP", { locale: esLocale })}
                </span>
                {" · "}
                Edad calculada:{" "}
                {calculateAgeFromBirthDateString(
                  formatDateOnlyLocal(editData.birthDate)
                ) ?? "—"}{" "}
                años
              </p>
            ) : null}
          </div>

          <div>
            <Label>Sexo</Label>
            <RadioGroup
              value={editData.gender}
              onValueChange={(value) =>
                setEditData((prev) => ({
                  ...prev,
                  gender: value as "male" | "female" | "other",
                }))
              }
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="edit-male" />
                <Label htmlFor="edit-male">Masculino</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="edit-female" />
                <Label htmlFor="edit-female">Femenino</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="edit-other" />
                <Label htmlFor="edit-other">Otro</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="edit-weight">Peso</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="edit-weight"
                type="number"
                value={editData.weight}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, weight: e.target.value }))
                }
                min={editData.weightUnit === "kg" ? "30" : "66"}
                max={editData.weightUnit === "kg" ? "300" : "661"}
                step="0.1"
                className="h-11 flex-1 rounded-xl tabular"
              />
              <Select
                value={editData.weightUnit}
                onValueChange={handleWeightUnitChange}
              >
                <SelectTrigger className="h-11 w-24 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lbs">lbs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="edit-height">Altura</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="edit-height"
                type="number"
                value={editData.height}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, height: e.target.value }))
                }
                min={editData.heightUnit === "cm" ? "100" : "39"}
                max={editData.heightUnit === "cm" ? "250" : "98"}
                step="0.1"
                className="h-11 flex-1 rounded-xl tabular"
              />
              <Select
                value={editData.heightUnit}
                onValueChange={handleHeightUnitChange}
              >
                <SelectTrigger className="h-11 w-24 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="inches">inches</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Nivel de actividad</Label>
            <Select
              value={editData.activityLevel}
              onValueChange={(value) =>
                setEditData((prev) => ({
                  ...prev,
                  activityLevel: value as EditData["activityLevel"],
                }))
              }
            >
              <SelectTrigger className="mt-1 h-11 w-full rounded-xl">
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

          <div>
            <Label>Objetivo</Label>
            <Select
              value={editData.fitnessGoal}
              onValueChange={(value) =>
                setEditData((prev) => ({
                  ...prev,
                  fitnessGoal: value as EditData["fitnessGoal"],
                }))
              }
            >
              <SelectTrigger className="mt-1 h-11 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shedding">Perder peso</SelectItem>
                <SelectItem value="maintenance">Mantener peso</SelectItem>
                <SelectItem value="bulking">Ganar masa muscular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Idioma de la IA</Label>
            <Select
              value={editData.language}
              onValueChange={(value) =>
                setEditData((prev) => ({ ...prev, language: value }))
              }
            >
              <SelectTrigger className="mt-1 h-11 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 flex-1 rounded-full"
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} className="h-11 flex-1 rounded-full" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
