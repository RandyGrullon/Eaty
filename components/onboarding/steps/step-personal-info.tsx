"use client";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { User } from "lucide-react";
import type {
  OnboardingData,
  UpdateOnboardingField,
} from "../onboarding-types";

interface StepProps {
  data: OnboardingData;
  updateData: UpdateOnboardingField;
}

const GENDERS: { value: OnboardingData["gender"]; emoji: string; label: string }[] = [
  { value: "male", emoji: "👨", label: "Masculino" },
  { value: "female", emoji: "👩", label: "Femenino" },
  { value: "other", emoji: "🌟", label: "Otro" },
];

export function StepPersonalInfo({ data, updateData }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">
          Información Personal
        </h2>
        <p className="text-muted-foreground">
          Cuéntanos un poco sobre ti para personalizar tu experiencia
        </p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Edad</Label>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {data.age} años
            </Badge>
          </div>
          <div className="px-2">
            <Slider
              value={[data.age]}
              onValueChange={(value) => updateData("age", value[0])}
              max={120}
              min={13}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>13</span>
              <span>120</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-medium">Género</Label>
          <div className="grid grid-cols-3 gap-3">
            {GENDERS.map(({ value, emoji, label }) => (
              <button
                key={value}
                onClick={() => updateData("gender", value)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  data.gender === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-2">{emoji}</div>
                <div className="font-medium">{label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
