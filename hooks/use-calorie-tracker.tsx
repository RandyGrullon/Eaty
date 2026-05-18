"use client";

import useSWR from "swr";
import { useAuth } from "./use-auth";
import { getUserProfile } from "@/lib/meals";
import { calculateTDEEPrecise } from "@/lib/tdee";
import { getTodayStats } from "@/lib/meals";
import { getProfileDisplayAge } from "@/lib/age-from-birthdate";

export interface CalorieData {
  dailyGoal: number;
  consumed: number;
  remaining: number;
  bmr: number;
  tdee: number;
  mealsCount: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  consumedMacros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  waterGlasses: number;
  streak: number;
  explanation: string;
}

export function useCalorieTracker() {
  const { user } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<CalorieData, Error>(
    user ? ["calorie-tracker", user.uid] : null,
    async ([ , uid]: readonly [string, string]) => {
      // Get user profile
      const profile = await getUserProfile(uid);
      if (!profile) {
        throw new Error("No se encontró el perfil del usuario");
      }

      const displayAge = getProfileDisplayAge(profile);

      // Check if profile has required fields for TDEE calculation
      if (
        displayAge == null ||
        !profile.weight ||
        !profile.height ||
        !profile.activityLevel ||
        !profile.fitnessGoal
      ) {
        throw new Error(
          "El perfil está incompleto. Complete el onboarding para calcular calorías."
        );
      }

      const weightNum = typeof profile.weight === 'string' ? 0 : (profile.weight || 0);
      const heightNum = typeof profile.height === 'string' ? 0 : (profile.height || 0);

      const todayStats = await getTodayStats(uid);

      if (weightNum <= 0 || heightNum <= 0) {
         // Si los datos están cifrados o no son válidos, no podemos calcular el TDEE aquí
         return {
           dailyGoal: 2000,
           consumed: todayStats.totalCalories,
           remaining: Math.max(0, 2000 - todayStats.totalCalories),
           bmr: 0,
           tdee: 0,
           mealsCount: todayStats.mealsCount,
           macros: { protein: 0, carbs: 0, fat: 0 },
           consumedMacros: todayStats.macros,
           waterGlasses: todayStats.waterGlasses,
           streak: profile.currentStreak || 0,
           explanation: "No se puede calcular sin datos de peso/altura.",
         };
      }

      const tdeeData = calculateTDEEPrecise({
        age: displayAge,
        gender: profile.gender || "other",
        weight: weightNum,
        height: heightNum,
        activityLevel: profile.activityLevel,
        fitnessGoal: profile.fitnessGoal,
      });

      const consumed = todayStats.totalCalories;
      const remaining = Math.max(0, tdeeData.dailyCalories - consumed);

      return {
        dailyGoal: tdeeData.dailyCalories,
        consumed,
        remaining,
        bmr: tdeeData.bmr,
        tdee: tdeeData.tdee,
        mealsCount: todayStats.mealsCount,
        macros: tdeeData.macros,
        consumedMacros: todayStats.macros,
        waterGlasses: todayStats.waterGlasses,
        streak: profile.currentStreak || 0,
        explanation: tdeeData.explanation,
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    calorieData: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refreshData: () => mutate(),
    mutate,
  };
}
