"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { EatyMark } from "@/components/app/eaty-logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useOnboardingForm } from "@/hooks/use-onboarding-form";
import { isOnboardingStepValid } from "@/lib/onboarding-validation";
import { saveUserProfile } from "@/lib/meals";
import { logger } from "@/lib/logger";
import type { UserProfile } from "@/types/meal";
import { TOTAL_ONBOARDING_STEPS } from "./onboarding-types";
import { StepPersonalInfo } from "./steps/step-personal-info";
import { StepBodyMetrics } from "./steps/step-body-metrics";
import { StepActivityLevel } from "./steps/step-activity-level";
import { StepFitnessGoal } from "./steps/step-fitness-goal";
import { StepSummary } from "./steps/step-summary";

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const {
    data,
    updateData,
    handleUnitSwitch,
    handleFeetChange,
    handleInchesChange,
    formatHeightDisplay,
  } = useOnboardingForm();

  const totalSteps = TOTAL_ONBOARDING_STEPS;
  const progress = (currentStep / totalSteps) * 100;
  const stepValid = isOnboardingStepValid(currentStep, data);

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    setSaveError("");
    try {
      // Convertir unidades a valores estándar.
      const weightInKg =
        data.weightUnit === "lbs"
          ? parseFloat(data.weight) * 0.453592
          : parseFloat(data.weight);
      const heightInCm =
        data.heightUnit === "inches"
          ? parseFloat(data.height) * 2.54
          : parseFloat(data.height);

      const profileData: Omit<UserProfile, "uid" | "createdAt" | "updatedAt"> = {
        age: data.age,
        gender: data.gender,
        weight: Math.round(weightInKg * 10) / 10,
        height: Math.round(heightInCm * 10) / 10,
        weightUnit: data.weightUnit,
        heightUnit: data.heightUnit,
        activityLevel: data.activityLevel,
        fitnessGoal: data.fitnessGoal,
      };

      await saveUserProfile(user.uid, profileData);
      onComplete?.();
    } catch (error) {
      logger.error("Error saving profile", error);
      setSaveError("No se pudo guardar tu perfil. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepPersonalInfo data={data} updateData={updateData} />;
      case 2:
        return (
          <StepBodyMetrics
            data={data}
            updateData={updateData}
            onUnitSwitch={handleUnitSwitch}
            onFeetChange={handleFeetChange}
            onInchesChange={handleInchesChange}
            formatHeightDisplay={formatHeightDisplay}
          />
        );
      case 3:
        return <StepActivityLevel data={data} updateData={updateData} />;
      case 4:
        return <StepFitnessGoal data={data} updateData={updateData} />;
      case 5:
        return <StepSummary data={data} formatHeightDisplay={formatHeightDisplay} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-4 px-4 py-3">
          <EatyMark className="h-8 w-8 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Paso {currentStep} de {totalSteps}
              </span>
              <span className="tabular">{Math.round(progress)}%</span>
            </div>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors duration-300",
                    i < currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await logout();
              } catch (error) {
                logger.error("Error al cerrar sesión", error);
              }
            }}
            className="rounded-full text-muted-foreground"
          >
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-32 pt-8">
        <div key={currentStep} className="animate-in fade-in-0 slide-in-from-right-4 duration-300">
          {renderStep()}
        </div>
        {saveError ? (
          <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl gap-3 px-4 py-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={prevStep}
              className="h-12 rounded-full px-5"
              disabled={loading}
              aria-label="Paso anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {currentStep < totalSteps ? (
            <Button
              onClick={nextStep}
              className="h-12 flex-1 rounded-full text-base"
              disabled={!stepValid || loading}
            >
              Continuar
              <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          ) : (
            <Button onClick={handleComplete} className="h-12 flex-1 rounded-full text-base" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Empezar a usar Eaty
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
