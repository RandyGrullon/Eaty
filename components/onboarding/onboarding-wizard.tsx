"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Loader2, Settings } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">
              Paso {currentStep} de {totalSteps}
            </span>
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
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Cerrar sesión
            </Button>
          </div>

          {/* Indicadores de pasos visuales */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step === currentStep
                      ? "bg-primary text-primary-foreground shadow-md"
                      : step < currentStep
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step < currentStep ? "✓" : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`w-8 h-0.5 mx-1 transition-colors ${
                      step < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent className="space-y-6 min-h-[400px] transition-all duration-300 ease-in-out">
          <div
            key={currentStep}
            className="animate-in fade-in-0 slide-in-from-right-5 duration-300"
          >
            {renderStep()}
          </div>

          <div className="flex gap-3 pt-6">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                className="flex-1 h-12 text-base font-medium"
                disabled={loading}
              >
                <ChevronLeft className="h-5 w-5 mr-2" />
                Anterior
              </Button>
            )}

            {currentStep < totalSteps ? (
              <Button
                onClick={nextStep}
                className="flex-1 h-12 text-base font-medium shadow-md"
                disabled={!stepValid || loading}
              >
                Siguiente
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="flex-1 h-12 text-base font-medium shadow-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Settings className="h-5 w-5 mr-2" />
                    Completar Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
