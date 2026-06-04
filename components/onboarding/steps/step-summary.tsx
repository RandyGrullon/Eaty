"use client";

import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import type { OnboardingData } from "../onboarding-types";

interface StepSummaryProps {
  data: OnboardingData;
  formatHeightDisplay: () => string;
}

const GENDER_LABELS: Record<OnboardingData["gender"], string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
};

const ACTIVITY_LABELS: Record<OnboardingData["activityLevel"], string> = {
  sedentary: "Sedentario",
  light: "Ligero",
  moderate: "Moderado",
  active: "Activo",
  very_active: "Muy Activo",
};

const GOAL_LABELS: Record<OnboardingData["fitnessGoal"], string> = {
  bulking: "Bulking",
  shedding: "Shedding",
  maintenance: "Mantenimiento",
};

export function StepSummary({ data, formatHeightDisplay }: StepSummaryProps) {
  const rows = [
    { label: "Edad", value: `${data.age} años` },
    { label: "Sexo", value: GENDER_LABELS[data.gender] },
    { label: "Peso", value: `${data.weight} ${data.weightUnit}` },
    { label: "Altura", value: formatHeightDisplay() },
    { label: "Actividad", value: ACTIVITY_LABELS[data.activityLevel] },
    { label: "Objetivo", value: GOAL_LABELS[data.fitnessGoal] },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">¡Listo!</h2>
        <p className="text-muted-foreground">
          Revisa tu información antes de continuar
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
