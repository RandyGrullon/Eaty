import { describe, it, expect } from "vitest";
import {
  deriveTodayStats,
  deriveWeeklyProgress,
  deriveCalorieData,
} from "./app-data-derive";
import type { Meal, UserProfile } from "@/types/meal";

function makeMeal(p: Partial<Meal> & { createdAt: Date }): Meal {
  return {
    id: Math.random().toString(36),
    imageUrl: null,
    foodName: "Test",
    calories: 100,
    macros: { protein: 10, carbs: 10, fat: 5, fiber: 0, sugar: 0 },
    recommendations: [],
    isPlanned: false,
    ...p,
  };
}

function makeProfile(p: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...p,
  };
}

describe("deriveTodayStats", () => {
  const now = new Date(2026, 5, 6, 12, 0); // 6 jun 2026

  it("suma solo las comidas registradas de hoy", () => {
    const meals = [
      makeMeal({
        createdAt: new Date(2026, 5, 6, 9, 0),
        calories: 300,
        macros: { protein: 20, carbs: 30, fat: 10, fiber: 0, sugar: 0 },
      }),
      makeMeal({ createdAt: new Date(2026, 5, 5, 9, 0), calories: 500 }), // ayer
      makeMeal({
        createdAt: new Date(2026, 5, 6, 20, 0),
        calories: 999,
        isPlanned: true, // planificada → no cuenta
      }),
    ];
    const stats = deriveTodayStats(meals, 4, now);
    expect(stats.mealsCount).toBe(1);
    expect(stats.totalCalories).toBe(300);
    expect(stats.macros.protein).toBe(20);
    expect(stats.waterGlasses).toBe(4);
  });
});

describe("deriveWeeklyProgress", () => {
  const now = new Date(2026, 5, 6, 12, 0);

  it("compara la semana actual con la previa", () => {
    const cur = makeMeal({ createdAt: now, calories: 400 });
    const prev = makeMeal({
      createdAt: new Date(now.getTime() - 7 * 86400000),
      calories: 200,
    });
    const wp = deriveWeeklyProgress([cur, prev], now);
    expect(wp.currentWeek.totalMeals).toBe(1);
    expect(wp.currentWeek.totalCalories).toBe(400);
    expect(wp.previousWeek.totalMeals).toBe(1);
    expect(wp.previousWeek.totalCalories).toBe(200);
    expect(wp.progress.caloriesChange).toBe(100);
  });
});

describe("deriveCalorieData", () => {
  const today = {
    mealsCount: 1,
    totalCalories: 500,
    macros: { protein: 30, carbs: 40, fat: 10 },
    waterGlasses: 2,
  };

  it("devuelve null sin perfil", () => {
    expect(deriveCalorieData(null, today)).toBeNull();
  });

  it("usa las metas de la dieta activa (customGoals)", () => {
    const profile = makeProfile({
      activeDietId: "d1",
      customGoals: { calories: 1800, protein: 150, carbs: 120, fat: 50 },
      age: 30,
      weight: 70,
      height: 175,
      gender: "male",
      activityLevel: "moderate",
      fitnessGoal: "shedding",
    });
    const cd = deriveCalorieData(profile, today)!;
    expect(cd.dailyGoal).toBe(1800);
    expect(cd.macros.protein).toBe(150);
    expect(cd.remaining).toBe(1300);
  });

  it("usa el TDEE cuando no hay dieta activa", () => {
    const profile = makeProfile({
      age: 30,
      weight: 70,
      height: 175,
      gender: "male",
      activityLevel: "moderate",
      fitnessGoal: "maintenance",
    });
    const cd = deriveCalorieData(profile, today)!;
    expect(cd.bmr).toBeGreaterThan(0);
    expect(cd.dailyGoal).toBeGreaterThan(2000);
  });

  it("acepta peso/altura como strings numéricos (datos antiguos)", () => {
    const base = {
      age: 30,
      gender: "male" as const,
      activityLevel: "moderate" as const,
      fitnessGoal: "maintenance" as const,
    };
    const asNumbers = deriveCalorieData(
      makeProfile({ ...base, weight: 70, height: 175 }),
      today
    )!;
    const asStrings = deriveCalorieData(
      makeProfile({ ...base, weight: "70", height: "175" }),
      today
    )!;
    expect(asStrings.dailyGoal).toBe(asNumbers.dailyGoal);
    expect(asStrings.bmr).toBeGreaterThan(0);
  });

  it("cae a 2000 con perfil incompleto", () => {
    const profile = makeProfile({ age: 30 }); // sin peso/altura
    const cd = deriveCalorieData(profile, today)!;
    expect(cd.dailyGoal).toBe(2000);
    expect(cd.bmr).toBe(0);
  });
});
