import type { FoodAnalysisMealFields } from "@/lib/food-analysis-schema";
import { GroqApiError } from "@/lib/groq-api-error";

export type AnalyzeFoodParams = {
  imageBase64?: string;
  imageMimeType?: string;
  foodName?: string;
  description?: string;
};

/**
 * Analiza comida vía API interna (clave Groq solo en servidor).
 * Incluye la cookie de sesión (`eaty_session`) y opcionalmente Bearer a la vez.
 */
export async function analyzeFood(
  params: AnalyzeFoodParams,
  idToken: string
): Promise<FoodAnalysisMealFields> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idToken.trim()) {
    headers.Authorization = `Bearer ${idToken.trim()}`;
  }

  const res = await fetch("/api/analyze-food", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      imageBase64: params.imageBase64,
      imageMimeType: params.imageMimeType,
      foodName: params.foodName,
      description: params.description,
    }),
  });

  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Error ${res.status}`;
    throw new GroqApiError(errMsg, res.status);
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
  dailyGoal: number | undefined,
  options: { recentSummary?: string; idToken: string }
): Promise<string[]> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (options.idToken.trim()) {
    h.Authorization = `Bearer ${options.idToken.trim()}`;
  }

  const res = await fetch("/api/nutrition-tips", {
    method: "POST",
    credentials: "include",
    headers: h,
    body: JSON.stringify({
      meals,
      totalCalories,
      dailyGoal,
      recentSummary: options.recentSummary,
    }),
  });

  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Error ${res.status}`;
    throw new GroqApiError(errMsg, res.status);
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "tips" in data &&
    Array.isArray((data as { tips: unknown }).tips)
  ) {
    return (data as { tips: string[] }).tips;
  }

  throw new GroqApiError("Respuesta de consejos inválida.", 500);
}
