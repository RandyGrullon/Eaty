/**
 * Convierte un `DietPlan` del Diet Builder en una dieta normal de Eaty, para
 * guardarla, activarla (fija las metas del dashboard) y ver los tutoriales.
 */
import { dietDishImageUrl } from "@/lib/diets";
import type { NewDiet } from "@/lib/diets";
import type { DietDish, DietMealType, DishTutorial } from "@/types/diet";
import { MEAL_PROTOCOL_LABEL, type DietPlan, type MealProtocol, type Recipe } from "./types";

const MEAL_TYPES: Record<MealProtocol, DietMealType[]> = {
  if_16_8: ["lunch", "dinner"],
  three_meals: ["breakfast", "lunch", "dinner"],
  four_meals: ["breakfast", "lunch", "snack", "dinner"],
};

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function recipeToTutorial(recipe: Recipe): DishTutorial {
  return {
    servings: 1,
    prepTimeMin: recipe.prepMinutes,
    cookTimeMin: recipe.cookMinutes,
    difficulty: recipe.steps.length > 5 ? "medium" : "easy",
    equipment: recipe.equipment.slice(0, 20),
    ingredients: recipe.ingredients.slice(0, 40).map((i) => ({
      item: clip(i.name, 120),
      amount: clip(`${i.grams} g${i.household ? ` (${i.household})` : ""}`, 60),
    })),
    steps: recipe.steps.slice(0, 30).map((s) => ({
      n: s.n,
      title: clip(s.title, 120),
      detail: clip(s.detail, 900),
      ...(s.tip ? { tip: clip(s.tip, 300) } : {}),
      ...(s.minutes ? { durationMin: s.minutes } : {}),
      ...(s.tempC ? { tempC: s.tempC } : {}),
    })),
    commonMistakes: recipe.hiddenCalorieTips.slice(0, 10).map((t) => clip(t, 300)),
    plating: clip(recipe.plating, 600),
  };
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function planToNewDiet(plan: DietPlan): NewDiet {
  const { targets, goal } = plan;
  const types = MEAL_TYPES[goal.protocol];

  const dishes: DietDish[] = plan.days.flatMap((day) =>
    day.meals.map((meal, i) => ({
      id: newId(),
      name: clip(meal.recipe.name, 160),
      type: types[i] ?? "lunch",
      description: clip(
        meal.recipe.ingredients.map((ing) => `${ing.grams} g ${ing.name.toLowerCase()}`).join(" · "),
        500
      ),
      imageUrl: dietDishImageUrl(meal.recipe.name),
      calories: meal.recipe.nutrition.kcal,
      macros: {
        protein: meal.recipe.nutrition.protein,
        carbs: meal.recipe.nutrition.netCarbs,
        fat: meal.recipe.nutrition.fat,
      },
      tutorial: recipeToTutorial(meal.recipe),
      day: day.day,
      mealLabel: clip(meal.label, 60),
      time: meal.time,
      portions: meal.recipe.ingredients.map((ing) => ({
        name: ing.name,
        grams: ing.grams,
        ...(ing.household ? { household: ing.household } : {}),
      })),
    }))
  );

  const lowCarb = targets.style === "low_carb";
  const name =
    goal.lossLbs > 0
      ? `Plan −${goal.lossLbs} lb · ${goal.durationDays} días`
      : `Plan de mantenimiento · ${MEAL_PROTOCOL_LABEL[goal.protocol]}`;

  return {
    name,
    description: `Generado con tus alimentos: ${targets.kcal} kcal/día (déficit de ${targets.dailyDeficit} kcal sobre un gasto de ${targets.tdee}), ${targets.protein} g de proteína. Ritmo estimado: ${targets.weeklyLossLbs} lb por semana.`,
    goal: goal.lossLbs > 0 ? "shedding" : "maintenance",
    tags: [
      MEAL_PROTOCOL_LABEL[goal.protocol],
      lowCarb ? "Low carb" : "Equilibrada",
      `${plan.ingredients.length} alimentos`,
    ],
    imageUrl: dishes[0]?.imageUrl ?? null,
    targetCalories: targets.kcal,
    targetMacros: { protein: targets.protein, carbs: targets.netCarbs, fat: targets.fat },
    dishes,
    createdBy: "user",
    status: "ready",
    plan: {
      source: "builder",
      lossLbs: goal.lossLbs,
      durationDays: goal.durationDays,
      projectedDays: targets.projectedDays,
      weeklyLossLbs: targets.weeklyLossLbs,
      protocol: goal.protocol,
      bmr: targets.bmr,
      tdee: targets.tdee,
      dailyDeficit: targets.dailyDeficit,
      ingredientIds: plan.ingredients.map((i) => i.id),
      days: plan.days.length,
    },
  };
}
