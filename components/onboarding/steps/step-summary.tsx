"use client";

import { useMemo } from "react";
import { calculateTDEEPrecise } from "@/lib/tdee";
import type { OnboardingData } from "../onboarding-types";
import { StepHeader } from "../option-card";

interface StepSummaryProps {
  data: OnboardingData;
  formatHeightDisplay: () => string;
}

const GENDER_LABELS: Record<OnboardingData["gender"], string> = {
  male: "Hombre",
  female: "Mujer",
  other: "Otro",
};

const ACTIVITY_LABELS: Record<OnboardingData["activityLevel"], string> = {
  sedentary: "Sedentario",
  light: "Ligero",
  moderate: "Moderado",
  active: "Activo",
  very_active: "Muy activo",
};

const GOAL_LABELS: Record<OnboardingData["fitnessGoal"], string> = {
  bulking: "Ganar músculo",
  shedding: "Perder grasa",
  maintenance: "Mantener peso",
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

  // Vista previa de la meta con los mismos cálculos que usará la app.
  const preview = useMemo(() => {
    const w = parseFloat(data.weight);
    const h = parseFloat(data.height);
    if (!w || !h) return null;
    const weight = data.weightUnit === "lbs" ? w * 0.453592 : w;
    const height = data.heightUnit === "inches" ? h * 2.54 : h;
    try {
      return calculateTDEEPrecise({
        age: data.age,
        gender: data.gender,
        weight,
        height,
        activityLevel: data.activityLevel,
        fitnessGoal: data.fitnessGoal,
      });
    } catch {
      return null;
    }
  }, [data]);

  return (
    <div>
      <StepHeader title="Todo listo" description="Revisa tus datos. Podrás cambiarlos cuando quieras desde tu perfil." />

      {preview ? (
        <div className="mb-4 rounded-2xl bg-primary p-5 text-primary-foreground">
          <p className="text-sm opacity-85">Tu meta diaria estimada</p>
          <p className="mt-1 font-display text-4xl font-bold tabular">
            {preview.dailyCalories}
            <span className="ml-1.5 text-base font-normal opacity-85">kcal</span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            {[
              { label: "Proteína", value: preview.macros.protein },
              { label: "Carbohidratos", value: preview.macros.carbs },
              { label: "Grasa", value: preview.macros.fat },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-primary-foreground/12 px-3 py-2">
                <p className="text-xs opacity-80">{m.label}</p>
                <p className="font-semibold tabular">{m.value} g</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <dl className="divide-y divide-border rounded-2xl border border-border bg-card">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
