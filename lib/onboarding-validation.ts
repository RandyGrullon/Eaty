import type { OnboardingData } from "@/components/onboarding/onboarding-types";

/** Valida si el paso actual del onboarding tiene los datos requeridos. */
export function isOnboardingStepValid(
  step: number,
  data: OnboardingData
): boolean {
  switch (step) {
    case 1:
      return data.age >= 13 && data.age <= 120 && Boolean(data.gender);
    case 2:
      return Boolean(
        data.weight &&
          parseFloat(data.weight) > 0 &&
          data.height &&
          parseFloat(data.height) > 0 &&
          (data.heightUnit === "cm" || (data.heightFeet && data.heightInches))
      );
    case 3:
      return Boolean(data.activityLevel);
    case 4:
      return Boolean(data.fitnessGoal);
    case 5:
      return true;
    default:
      return false;
  }
}
