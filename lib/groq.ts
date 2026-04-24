import type { FoodAnalysisMealFields } from "@/lib/food-analysis-schema";

export type AnalyzeFoodParams = {
  imageBase64?: string;
  imageMimeType?: string;
  foodName?: string;
  description?: string;
};

/**
 * Analiza comida vía API interna (clave Groq solo en servidor).
 */
export async function analyzeFood(
  params: AnalyzeFoodParams
): Promise<FoodAnalysisMealFields> {
  const res = await fetch("/api/analyze-food", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: params.imageBase64,
      imageMimeType: params.imageMimeType,
      foodName: params.foodName,
      description: params.description,
    }),
  });

  const data: unknown = await res.json();

  if (!res.ok) {
    const err =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Error ${res.status}`;
    throw new Error(err);
  }

  return data as FoodAnalysisMealFields;
}

export async function generateNutritionTips(
  meals: Array<{
    foodName: string;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
  }>,
  totalCalories: number,
  dailyGoal?: number,
  options?: { recentSummary?: string }
): Promise<string[]> {
  const res = await fetch("/api/nutrition-tips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meals,
      totalCalories,
      dailyGoal,
      recentSummary: options?.recentSummary,
    }),
  });

  const data: unknown = await res.json();

  if (!res.ok) {
    const err =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Error ${res.status}`;
    throw new Error(err);
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "tips" in data &&
    Array.isArray((data as { tips: unknown }).tips)
  ) {
    return (data as { tips: string[] }).tips;
  }

  throw new Error("Respuesta de consejos inválida.");
}
