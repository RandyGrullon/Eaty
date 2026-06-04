export interface OnboardingData {
  age: number;
  gender: "male" | "female" | "other";
  weight: string;
  weightUnit: "kg" | "lbs";
  height: string;
  heightFeet: string;
  heightInches: string;
  heightUnit: "cm" | "inches";
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  fitnessGoal: "bulking" | "shedding" | "maintenance";
}

export type UpdateOnboardingField = (
  field: keyof OnboardingData,
  value: string | number
) => void;

export const TOTAL_ONBOARDING_STEPS = 5;
