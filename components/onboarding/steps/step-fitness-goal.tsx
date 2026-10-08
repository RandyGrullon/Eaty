"use client";

import { TrendingDown, TrendingUp, Scale, type LucideIcon } from "lucide-react";
import type { OnboardingData, UpdateOnboardingField } from "../onboarding-types";
import { OptionCard, StepHeader } from "../option-card";

interface StepProps {
  data: OnboardingData;
  updateData: UpdateOnboardingField;
}

const GOALS: {
  value: OnboardingData["fitnessGoal"];
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}[] = [
  {
    value: "shedding",
    label: "Perder grasa",
    description: "Déficit moderado manteniendo la proteína alta",
    icon: TrendingDown,
    tone: "bg-fat/12 text-fat",
  },
  {
    value: "maintenance",
    label: "Mantener peso",
    description: "Comer lo que gastas y mejorar la calidad",
    icon: Scale,
    tone: "bg-primary/10 text-primary",
  },
  {
    value: "bulking",
    label: "Ganar músculo",
    description: "Superávit ligero para construir masa magra",
    icon: TrendingUp,
    tone: "bg-protein/12 text-protein",
  },
];

export function StepFitnessGoal({ data, updateData }: StepProps) {
  return (
    <div>
      <StepHeader title="¿Cuál es tu objetivo?" description="Ajustaremos tu meta diaria y el reparto de macros." />
      <div role="radiogroup" aria-label="Objetivo" className="grid gap-2.5">
        {GOALS.map((g) => (
          <OptionCard
            key={g.value}
            icon={g.icon}
            label={g.label}
            description={g.description}
            tone={g.tone}
            selected={data.fitnessGoal === g.value}
            onSelect={() => updateData("fitnessGoal", g.value)}
          />
        ))}
      </div>
    </div>
  );
}
