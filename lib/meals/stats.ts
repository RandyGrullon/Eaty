import { doc, getDoc } from "firebase/firestore";
import { logger } from "@/lib/logger";
import { queryMealsInRange } from "@/lib/firestore-meal-utils";
import { getDb } from "./db";

export async function getTodayStats(userId: string): Promise<{
  mealsCount: number;
  totalCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  waterGlasses: number;
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Solo las comidas de hoy, acotadas en el servidor.
    const meals = await queryMealsInRange(userId, today, tomorrow);

    let mealsCount = 0;
    let totalCalories = 0;
    const macros = { protein: 0, carbs: 0, fat: 0 };

    meals.forEach((meal) => {
      mealsCount++;
      totalCalories += meal.calories || 0;
      macros.protein += meal.macros.protein || 0;
      macros.carbs += meal.macros.carbs || 0;
      macros.fat += meal.macros.fat || 0;
    });

    // Obtener hidratación del documento de stats diario.
    const dateKey = today.toISOString().split("T")[0];
    const statsRef = doc(getDb(), "users", userId, "dailyStats", dateKey);
    const statsSnap = await getDoc(statsRef);
    const waterGlasses = statsSnap.exists()
      ? statsSnap.data().waterGlasses || 0
      : 0;

    return { mealsCount, totalCalories, macros, waterGlasses };
  } catch (error) {
    logger.error("Error fetching today stats", error);
    return {
      mealsCount: 0,
      totalCalories: 0,
      macros: { protein: 0, carbs: 0, fat: 0 },
      waterGlasses: 0,
    };
  }
}

export async function getMonthlyStats(
  userId: string,
  year: number,
  month: number
): Promise<{
  totalMeals: number;
  totalCalories: number;
  averageCalories: number;
  daysWithMeals: number;
}> {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const meals = await queryMealsInRange(userId, startDate, endDate);

    let totalMeals = 0;
    let totalCalories = 0;
    const daysWithMeals = new Set<string>();

    meals.forEach((meal) => {
      totalMeals++;
      totalCalories += meal.calories || 0;
      daysWithMeals.add(meal.createdAt.toDateString());
    });

    const averageCalories =
      totalMeals > 0 ? Math.round(totalCalories / totalMeals) : 0;

    return {
      totalMeals,
      totalCalories,
      averageCalories,
      daysWithMeals: daysWithMeals.size,
    };
  } catch (error) {
    logger.error("Error fetching monthly stats", error);
    return {
      totalMeals: 0,
      totalCalories: 0,
      averageCalories: 0,
      daysWithMeals: 0,
    };
  }
}

export async function getWeeklyProgress(userId: string): Promise<{
  currentWeek: {
    totalMeals: number;
    totalCalories: number;
    averageCalories: number;
    daysActive: number;
  };
  previousWeek: {
    totalMeals: number;
    totalCalories: number;
    averageCalories: number;
    daysActive: number;
  };
  progress: {
    mealsChange: number;
    caloriesChange: number;
    daysChange: number;
  };
}> {
  try {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Inicio de semana (domingo)
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 7);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const previousWeekEnd = new Date(currentWeekStart);

    // Una sola consulta acotada a las dos semanas; partimos en cliente.
    const meals = await queryMealsInRange(
      userId,
      previousWeekStart,
      currentWeekEnd
    );

    let currentWeekMeals = 0;
    let currentWeekCalories = 0;
    let previousWeekMeals = 0;
    let previousWeekCalories = 0;
    const currentWeekDays = new Set<string>();
    const previousWeekDays = new Set<string>();

    meals.forEach((meal) => {
      const mealDate = meal.createdAt;
      if (mealDate >= currentWeekStart && mealDate < currentWeekEnd) {
        currentWeekMeals++;
        currentWeekCalories += meal.calories || 0;
        currentWeekDays.add(mealDate.toDateString());
      } else if (mealDate >= previousWeekStart && mealDate < previousWeekEnd) {
        previousWeekMeals++;
        previousWeekCalories += meal.calories || 0;
        previousWeekDays.add(mealDate.toDateString());
      }
    });

    const currentWeek = {
      totalMeals: currentWeekMeals,
      totalCalories: currentWeekCalories,
      averageCalories:
        currentWeekMeals > 0
          ? Math.round(currentWeekCalories / currentWeekMeals)
          : 0,
      daysActive: currentWeekDays.size,
    };

    const previousWeek = {
      totalMeals: previousWeekMeals,
      totalCalories: previousWeekCalories,
      averageCalories:
        previousWeekMeals > 0
          ? Math.round(previousWeekCalories / previousWeekMeals)
          : 0,
      daysActive: previousWeekDays.size,
    };

    const pct = (current: number, previous: number) =>
      previous > 0
        ? Math.round(((current - previous) / previous) * 100)
        : current > 0
        ? 100
        : 0;

    const progress = {
      mealsChange: pct(currentWeek.totalMeals, previousWeek.totalMeals),
      caloriesChange: pct(currentWeek.totalCalories, previousWeek.totalCalories),
      daysChange: pct(currentWeek.daysActive, previousWeek.daysActive),
    };

    return { currentWeek, previousWeek, progress };
  } catch (error) {
    logger.error("Error fetching weekly progress", error);
    return {
      currentWeek: {
        totalMeals: 0,
        totalCalories: 0,
        averageCalories: 0,
        daysActive: 0,
      },
      previousWeek: {
        totalMeals: 0,
        totalCalories: 0,
        averageCalories: 0,
        daysActive: 0,
      },
      progress: { mealsChange: 0, caloriesChange: 0, daysChange: 0 },
    };
  }
}
