"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Target } from "lucide-react";
import type {
  OnboardingData,
  UpdateOnboardingField,
} from "../onboarding-types";

interface StepProps {
  data: OnboardingData;
  updateData: UpdateOnboardingField;
}

const GOALS: {
  value: OnboardingData["fitnessGoal"];
  label: string;
  description: string;
}[] = [
  { value: "bulking", label: "Bulking", description: "Ganar masa muscular y peso" },
  { value: "shedding", label: "Shedding", description: "Perder peso y grasa corporal" },
  { value: "maintenance", label: "Mantenimiento", description: "Mantener el peso actual" },
];

export function StepFitnessGoal({ data, updateData }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <Target className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">
          Objetivo de Fitness
        </h2>
        <p className="text-muted-foreground">¿Cuál es tu objetivo principal?</p>
      </div>

      <div className="space-y-4">
        <RadioGroup
          value={data.fitnessGoal}
          onValueChange={(value) =>
            updateData("fitnessGoal", value as OnboardingData["fitnessGoal"])
          }
        >
          <div className="space-y-3">
            {GOALS.map(({ value, label, description }) => (
              <div
                key={value}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
              >
                <RadioGroupItem value={value} id={value} className="mt-1" />
                <div>
                  <Label htmlFor={value} className="font-medium">
                    {label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
