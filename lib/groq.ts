import { GroqApiError } from "@/lib/groq-api-error";
import type { FoodAnalysisMealFields, PersonalizedNutritionTip } from "./food-analysis-schema";
import { parseNutritionTipsFromApi } from "./food-analysis-schema";

export type AnalyzeFoodParams = {
  imageBase64?: string;
  imageMimeType?: string;
  foodName?: string;
  description?: string;
  allergens?: string[];
  lang?: string;
};

// Simple in-memory cache for the session
const ANALYSIS_CACHE: Record<string, { data: FoodAnalysisMealFields; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Genera una clave única para el cache basada en los parámetros.
 * Para imágenes, no cacheamos (demasiado grandes para claves simples).
 * Para texto, usamos el foodName y description.
 */
function getCacheKey(params: AnalyzeFoodParams): string | null {
  if (params.imageBase64) return null; // No cacheamos imágenes por ahora
  
  const parts = [
    params.foodName?.toLowerCase().trim(),
    params.description?.toLowerCase().trim(),
    (params.allergens || []).sort().join(",").toLowerCase()
  ];
  
  if (!parts[0] && !parts[1]) return null;
  
  return parts.filter(Boolean).join("|");
}

/**
 * Analiza comida vía API interna (clave Groq solo en servidor).
 * Incluye la cookie de sesión (`eaty_session`) y opcionalmente Bearer a la vez.
 */
export async function analyzeFood(
  params: AnalyzeFoodParams,
  idToken: string
): Promise<FoodAnalysisMealFields> {
  const cacheKey = getCacheKey(params);
  const now = Date.now();

  if (cacheKey && ANALYSIS_CACHE[cacheKey]) {
    const entry = ANALYSIS_CACHE[cacheKey];
    if (now - entry.timestamp < CACHE_TTL) {
      console.log(`[Cache] Returning cached result for: ${cacheKey}`);
      return entry.data;
    }
  }

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
      allergens: params.allergens,
      lang: params.lang,
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

  const result = data as FoodAnalysisMealFields;

  if (cacheKey) {
    ANALYSIS_CACHE[cacheKey] = { data: result, timestamp: now };
  }

  return result;
}

export async function generateNutritionTips(
  meals: Array<{
    foodName: string;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
  }>,
  totalCalories: number,
  dailyGoal: number | undefined,
  options: { recentSummary?: string; idToken: string; lang?: string }
): Promise<PersonalizedNutritionTip[]> {
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
      lang: options.lang,
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

  try {
    return parseNutritionTipsFromApi(data);
  } catch {
    throw new GroqApiError("Respuesta de consejos inválida.", 500);
  }
}
