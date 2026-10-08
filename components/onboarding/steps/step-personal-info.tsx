"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { User, UserRound, CircleUserRound, type LucideIcon } from "lucide-react";
import type { OnboardingData, UpdateOnboardingField } from "../onboarding-types";
import { OptionCard, StepHeader } from "../option-card";

interface StepProps {
  data: OnboardingData;
  updateData: UpdateOnboardingField;
}

const GENDERS: { value: OnboardingData["gender"]; icon: LucideIcon; label: string }[] = [
  { value: "male", icon: User, label: "Hombre" },
  { value: "female", icon: UserRound, label: "Mujer" },
  { value: "other", icon: CircleUserRound, label: "Otro" },
];

export function StepPersonalInfo({ data, updateData }: StepProps) {
  return (
    <div>
      <StepHeader
        title="Cuéntanos de ti"
        description="Edad y sexo cambian tu metabolismo basal; los usamos solo para calcular tu meta."
      />

      <div className="space-y-8">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <Label className="text-base font-medium">Edad</Label>
            <span className="font-display text-3xl font-bold tabular">
              {data.age}
              <span className="ml-1 text-sm font-normal text-muted-foreground">años</span>
            </span>
          </div>
          <Slider
            value={[data.age]}
            onValueChange={(value) => updateData("age", value[0])}
            max={100}
            min={13}
            step={1}
            className="mt-5"
            aria-label="Edad"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>13</span>
            <span>100</span>
          </div>
        </div>

        <div>
          <Label className="text-base font-medium">Sexo</Label>
          <div role="radiogroup" aria-label="Sexo" className="mt-3 grid grid-cols-3 gap-2.5">
            {GENDERS.map(({ value, icon, label }) => (
              <OptionCard
                key={value}
                layout="tile"
                icon={icon}
                label={label}
                selected={data.gender === value}
                onSelect={() => updateData("gender", value)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
