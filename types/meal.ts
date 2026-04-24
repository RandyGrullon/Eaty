import type { FoodAnalysisAiContext } from "@/lib/food-analysis-schema";

export interface Meal {
  id: string;
  imageUrl: string | null;
  foodName: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  recommendations: string[];
  /** Qué vio/interpretó el modelo (descripción, confianza, porción, etc.). */
  aiContext?: FoodAnalysisAiContext;
  createdAt: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

export interface UserProfile {
  uid: string;
  /** ISO local date YYYY-MM-DD; si existe, la edad mostrada se deriva de aquí. */
  birthDate?: string;
  age?: number;
  gender?: "male" | "female" | "other";
  weight?: number; // in kg
  height?: number; // in cm
  /** Unidad preferida en la UI; el peso en Firestore sigue en kg. */
  weightUnit?: "kg" | "lbs";
  /** Unidad preferida en la UI; la altura en Firestore sigue en cm. */
  heightUnit?: "cm" | "inches";
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  fitnessGoal?: "bulking" | "shedding" | "maintenance";
  createdAt: Date;
  updatedAt: Date;
}
