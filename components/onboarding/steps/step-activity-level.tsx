"use client";

import { Activity } from "lucide-react";
import type {
  OnboardingData,
  UpdateOnboardingField,
} from "../onboarding-types";

interface StepProps {
  data: OnboardingData;
  updateData: UpdateOnboardingField;
}

const ACTIVITY_LEVELS: {
  value: OnboardingData["activityLevel"];
  label: string;
  description: string;
  icon: string;
  color: string;
}[] = [
  { value: "sedentary", label: "Sedentario", description: "Poco o ningún ejercicio", icon: "🪑", color: "bg-muted-foreground" },
  { value: "light", label: "Ligero", description: "Ejercicio ligero 1-3 días/semana", icon: "🚶", color: "bg-chart-2" },
  { value: "moderate", label: "Moderado", description: "Ejercicio moderado 3-5 días/semana", icon: "🏃", color: "bg-chart-3" },
  { value: "active", label: "Activo", description: "Ejercicio intenso 6-7 días/semana", icon: "💪", color: "bg-warning" },
  { value: "very_active", label: "Muy Activo", description: "Ejercicio muy intenso o trabajo físico", icon: "🔥", color: "bg-destructive" },
];

export function StepActivityLevel({ data, updateData }: StepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-primary mb-2">
          Nivel de Actividad
        </h2>
        <p className="text-muted-foreground">
          ¿Qué tan activo eres físicamente? Esto nos ayuda a calcular tus calorías diarias
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3">
          {ACTIVITY_LEVELS.map((activity) => (
            <button
              key={activity.value}
              onClick={() => updateData("activityLevel", activity.value)}
              className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                data.activityLevel === activity.value
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-muted hover:border-primary/50 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl ${activity.color}`}>
                  {activity.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-lg">{activity.label}</div>
                  <div className="text-muted-foreground text-sm">{activity.description}</div>
                </div>
                {data.activityLevel === activity.value && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
