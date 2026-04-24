"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { getUserProfile } from "@/lib/meals";
import { calculateTDEEPrecise } from "@/lib/tdee";
import { getTodayStats } from "@/lib/meals";
import { getProfileDisplayAge } from "@/lib/age-from-birthdate";

interface CalorieData {
  dailyGoal: number;
  consumed: number;
  remaining: number;
  bmr: number;
  tdee: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  explanation: string;
}

export function useCalorieTracker() {
  const { user } = useAuth();
  const [calorieData, setCalorieData] = useState<CalorieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCalorieData();
    }
  }, [user]);

  const loadCalorieData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user profile
      const profile = await getUserProfile(user.uid);
      if (!profile) {
        setError("No se encontró el perfil del usuario");
        return;
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
        setError(
          "El perfil está incompleto. Complete el onboarding para calcular calorías."
        );
        return;
      }

      const tdeeData = calculateTDEEPrecise({
        age: displayAge,
        gender: profile.gender || "other",
        weight: profile.weight,
        height: profile.height,
        activityLevel: profile.activityLevel,
        fitnessGoal: profile.fitnessGoal,
      });

      // Get today's consumed calories
      const todayStats = await getTodayStats(user.uid);

      const consumed = todayStats.totalCalories;
      const remaining = Math.max(0, tdeeData.dailyCalories - consumed);

      setCalorieData({
        dailyGoal: tdeeData.dailyCalories,
        consumed,
        remaining,
        bmr: tdeeData.bmr,
        tdee: tdeeData.tdee,
        macros: tdeeData.macros,
        explanation: tdeeData.explanation,
      });
    } catch (err) {
      console.error("Error loading calorie data:", err);
      setError("Error al calcular las calorías diarias");
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadCalorieData();
  };

  return {
    calorieData,
    loading,
    error,
    refreshData,
  };
}
