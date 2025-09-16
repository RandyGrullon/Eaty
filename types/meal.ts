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
  createdAt: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

export interface UserProfile {
  uid: string;
  age?: number;
  gender?: "male" | "female" | "other";
  weight?: number; // in kg
  height?: number; // in cm
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  createdAt: Date;
  updatedAt: Date;
}
