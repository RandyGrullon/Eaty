import { calculateTDEEPrecise } from "@/lib/tdee";
import { getProfileDisplayAge } from "@/lib/age-from-birthdate";
import { parseMeasure } from "@/lib/profile-measure";
import type { Meal, UserProfile } from "@/types/meal";

/**
 * Lógica pura de derivación del store global (`useAppData`). Vive fuera del hook
 * para poder testearla sin React ni Firebase.
 */

export interface CalorieData {
  dailyGoal: number;
  consumed: number;
  remaining: number;
  bmr: number;
  tdee: number;
  mealsCount: number;
  macros: { protein: number; carbs: number; fat: number };
  consumedMacros: { protein: number; carbs: number; fat: number };
  waterGlasses: number;
  streak: number;
  explanation: string;
}

export interface TodayStats {
  mealsCount: number;
  totalCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  waterGlasses: number;
}

export interface WeekBucket {
  totalMeals: number;
  totalCalories: number;
  averageCalories: number;
  daysActive: number;
}

export interface WeeklyProgress {
  currentWeek: WeekBucket;
  previousWeek: WeekBucket;
  progress: {
    mealsChange: number;
    caloriesChange: number;
    daysChange: number;
  };
}

export function deriveTodayStats(
  meals: Meal[],
  waterGlasses: number,
  now: Date = new Date()
): TodayStats {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  let mealsCount = 0;
  let totalCalories = 0;
  const macros = { protein: 0, carbs: 0, fat: 0 };

  for (const m of meals) {
    if (m.isPlanned) continue;
    if (m.createdAt >= start && m.createdAt < end) {
      mealsCount++;
      totalCalories += m.calories || 0;
      macros.protein += m.macros.protein || 0;
      macros.carbs += m.macros.carbs || 0;
      macros.fat += m.macros.fat || 0;
    }
  }
  return { mealsCount, totalCalories, macros, waterGlasses };
}

export function deriveWeeklyProgress(
  meals: Meal[],
  now: Date = new Date()
): WeeklyProgress {
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay());
  currentWeekStart.setHours(0, 0, 0, 0);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 7);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(currentWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(currentWeekStart);

  let cMeals = 0;
  let cCal = 0;
  let pMeals = 0;
  let pCal = 0;
  const cDays = new Set<string>();
  const pDays = new Set<string>();

  for (const meal of meals) {
    if (meal.isPlanned) continue;
    const d = meal.createdAt;
    if (d >= currentWeekStart && d < currentWeekEnd) {
      cMeals++;
      cCal += meal.calories || 0;
      cDays.add(d.toDateString());
    } else if (d >= previousWeekStart && d < previousWeekEnd) {
      pMeals++;
      pCal += meal.calories || 0;
      pDays.add(d.toDateString());
    }
  }

  const pct = (current: number, previous: number) =>
    previous > 0
      ? Math.round(((current - previous) / previous) * 100)
      : current > 0
        ? 100
        : 0;

  const currentWeek: WeekBucket = {
    totalMeals: cMeals,
    totalCalories: cCal,
    averageCalories: cMeals > 0 ? Math.round(cCal / cMeals) : 0,
    daysActive: cDays.size,
  };
  const previousWeek: WeekBucket = {
    totalMeals: pMeals,
    totalCalories: pCal,
    averageCalories: pMeals > 0 ? Math.round(pCal / pMeals) : 0,
    daysActive: pDays.size,
  };

  return {
    currentWeek,
    previousWeek,
    progress: {
      mealsChange: pct(currentWeek.totalMeals, previousWeek.totalMeals),
      caloriesChange: pct(currentWeek.totalCalories, previousWeek.totalCalories),
      daysChange: pct(currentWeek.daysActive, previousWeek.daysActive),
    },
  };
}

export function deriveCalorieData(
  profile: UserProfile | null,
  today: TodayStats
): CalorieData | null {
  if (!profile) return null;

  const hasCustom = Boolean(profile.activeDietId && profile.customGoals);
  const custom = profile.customGoals;
  const displayAge = getProfileDisplayAge(profile);
  // Strings numéricos ("72.5") cuentan; valores no numéricos (p. ej. cifrados antiguos) → 0.
  const weightNum = parseMeasure(profile.weight) ?? 0;
  const heightNum = parseMeasure(profile.height) ?? 0;

  const consumed = today.totalCalories;
  const base = {
    consumed,
    mealsCount: today.mealsCount,
    consumedMacros: today.macros,
    waterGlasses: today.waterGlasses,
    streak: profile.currentStreak || 0,
  };

  const complete =
    displayAge != null &&
    profile.weight &&
    profile.height &&
    profile.activityLevel &&
    profile.fitnessGoal &&
    weightNum > 0 &&
    heightNum > 0;

  if (!complete) {
    const goal = hasCustom ? custom!.calories : 2000;
    return {
      ...base,
      dailyGoal: goal,
      remaining: Math.max(0, goal - consumed),
      bmr: 0,
      tdee: 0,
      macros: hasCustom
        ? { protein: custom!.protein, carbs: custom!.carbs, fat: custom!.fat }
        : { protein: 0, carbs: 0, fat: 0 },
      explanation: hasCustom
        ? "Metas de tu dieta activa."
        : "Completa tu perfil para calcular tu meta personalizada.",
    };
  }

  const tdeeData = calculateTDEEPrecise({
    age: displayAge!,
    gender: profile.gender || "other",
    weight: weightNum,
    height: heightNum,
    activityLevel: profile.activityLevel!,
    fitnessGoal: profile.fitnessGoal!,
  });

  const goal = hasCustom ? custom!.calories : tdeeData.dailyCalories;
  const macros = hasCustom
    ? { protein: custom!.protein, carbs: custom!.carbs, fat: custom!.fat }
    : tdeeData.macros;

  return {
    ...base,
    dailyGoal: goal,
    remaining: Math.max(0, goal - consumed),
    bmr: tdeeData.bmr,
    tdee: tdeeData.tdee,
    macros,
    explanation: hasCustom
      ? `Metas de tu dieta activa (${goal} kcal/día).`
      : tdeeData.explanation,
  };
}
