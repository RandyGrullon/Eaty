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
    async ([, uid]: [string, string]) => {
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

      const tdeeData = calculateTDEEPrecise({
        age: displayAge,
        gender: profile.gender || "other",
        weight: profile.weight,
        height: profile.height,
        activityLevel: profile.activityLevel,
        fitnessGoal: profile.fitnessGoal,
      });

      // Get today's consumed calories and other stats
      const todayStats = await getTodayStats(uid);

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
