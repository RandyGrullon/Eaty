"use client";

import { Armchair, Footprints, Bike, Dumbbell, Flame, type LucideIcon } from "lucide-react";
import type { OnboardingData, UpdateOnboardingField } from "../onboarding-types";
import { OptionCard, StepHeader } from "../option-card";

interface StepProps {
  data: OnboardingData;
  updateData: UpdateOnboardingField;
}

const ACTIVITY_LEVELS: {
  value: OnboardingData["activityLevel"];
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { value: "sedentary", label: "Sedentario", description: "Poco o ningún ejercicio", icon: Armchair },
  { value: "light", label: "Ligero", description: "Ejercicio ligero 1-3 días por semana", icon: Footprints },
  { value: "moderate", label: "Moderado", description: "Ejercicio moderado 3-5 días por semana", icon: Bike },
  { value: "active", label: "Activo", description: "Ejercicio intenso 6-7 días por semana", icon: Dumbbell },
  { value: "very_active", label: "Muy activo", description: "Entreno muy intenso o trabajo físico", icon: Flame },
];

export function StepActivityLevel({ data, updateData }: StepProps) {
  return (
    <div>
      <StepHeader
        title="¿Cuánto te mueves?"
        description="Lo usamos para estimar las calorías que gastas cada día."
      />
      <div role="radiogroup" aria-label="Nivel de actividad" className="grid grid-cols-1 gap-2.5">
        {ACTIVITY_LEVELS.map((a) => (
          <OptionCard
            key={a.value}
            icon={a.icon}
            label={a.label}
            description={a.description}
            selected={data.activityLevel === a.value}
            onSelect={() => updateData("activityLevel", a.value)}
          />
        ))}
      </div>
    </div>
  );
}
