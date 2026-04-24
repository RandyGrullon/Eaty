import { z } from "zod";

export const confidenceLevelSchema = z.enum(["low", "medium", "high"]);

export const portionRelativeSchema = z.enum(["small", "medium", "large"]);

export const portionHypothesisSchema = z.union([
  z.object({
    relativeSize: portionRelativeSchema,
    notes: z.string().optional(),
  }),
  z
    .string()
    .min(1)
    .max(500)
    .transform((notes) => ({
      relativeSize: "medium" as z.infer<typeof portionRelativeSchema>,
      notes,
    })),
]);

export const foodMacrosSchema = z.object({
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
  sugar: z.number().nonnegative(),
});

/** Respuesta completa esperada del modelo (JSON mode). */
export const foodAnalysisRawSchema = z.object({
  visibleComponents: z.array(z.string()).min(1).max(24),
  dishDescription: z.string().min(1).max(500),
  cuisineOrStyle: z.string().max(120).optional(),
  cookingClues: z.string().max(200).optional(),
  ambiguityNotes: z.string().max(400).optional(),
  portionHypothesis: portionHypothesisSchema,
  confidence: confidenceLevelSchema,
  foodName: z.string().min(1).max(200),
  calories: z.number().min(1).max(3500),
  macros: foodMacrosSchema,
  recommendations: z.array(z.string()).min(2).max(5),
});

export type FoodAnalysisRaw = z.infer<typeof foodAnalysisRawSchema>;

/** Resumen de lo que la IA "vio" o interpretó (foto o texto), para mostrar en la UI. */
export type FoodAnalysisAiContext = {
  dishDescription: string;
  visibleComponents: string[];
  confidence: "low" | "medium" | "high";
  portionLabel: string;
  cuisineOrStyle?: string;
  cookingClues?: string;
  ambiguityNotes?: string;
};

function portionHypothesisToLabel(
  p: z.infer<typeof portionHypothesisSchema>
): string {
  const rel =
    p.relativeSize === "small"
      ? "pequeña"
      : p.relativeSize === "large"
        ? "grande"
        : "mediana / estándar";
  const n = p.notes?.trim();
  return n ? `Porción aprox. ${rel} — ${n}` : `Porción aprox. ${rel}`;
}

export function buildAiContextFromRaw(
  raw: FoodAnalysisRaw
): FoodAnalysisAiContext {
  return {
    dishDescription: raw.dishDescription.trim(),
    visibleComponents: [...raw.visibleComponents],
    confidence: raw.confidence,
    portionLabel: portionHypothesisToLabel(raw.portionHypothesis),
    cuisineOrStyle: raw.cuisineOrStyle?.trim() || undefined,
    cookingClues: raw.cookingClues?.trim() || undefined,
    ambiguityNotes: raw.ambiguityNotes?.trim() || undefined,
  };
}

export const nutritionTipsResponseSchema = z.object({
  tips: z.array(z.string().min(5).max(160)).min(3).max(5),
});

export type NutritionTipsResponse = z.infer<
  typeof nutritionTipsResponseSchema
>;

/** Campos que la app usa al guardar / mostrar una comida analizada. */
export type FoodAnalysisMealFields = {
  foodName: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  recommendations: string[];
  /** Presente cuando el análisis completo vino de la IA (con JSON válido). */
  aiContext?: FoodAnalysisAiContext;
};

const MACRO_CALORIE_TOLERANCE = 0.38;

export function macroCaloriesRough(macros: FoodAnalysisMealFields["macros"]): number {
  return (
    4 * macros.protein +
    4 * macros.carbs +
    9 * macros.fat +
    2 * macros.fiber
  );
}

export function isMacroCalorieCoherent(
  calories: number,
  macros: FoodAnalysisMealFields["macros"]
): boolean {
  if (calories <= 0) return false;
  const rough = macroCaloriesRough(macros);
  if (rough <= 0) return false;
  return (
    Math.abs(rough - calories) / calories <= MACRO_CALORIE_TOLERANCE
  );
}

export function toMealFields(raw: FoodAnalysisRaw): FoodAnalysisMealFields {
  return {
    foodName: raw.foodName.trim(),
    calories: Math.round(raw.calories),
    macros: {
      protein: Math.round(raw.macros.protein),
      carbs: Math.round(raw.macros.carbs),
      fat: Math.round(raw.macros.fat),
      fiber: Math.round(raw.macros.fiber),
      sugar: Math.round(raw.macros.sugar),
    },
    recommendations: raw.recommendations.map((s) => s.trim()).filter(Boolean),
  };
}

/**
 * A partir de la respuesta validada de la IA: ajusta kcal a los gramos (fórmula 4/4/9/2) si
 * el modelo se contradijo; mantiene los gramos (lo que "vino" de la estimación) y no usa
 * valores fijos de servidor.
 */
export function buildMealFromAnalyzedRaw(
  parsed: FoodAnalysisRaw
): FoodAnalysisMealFields {
  const meal = toMealFields(parsed);
  const rough = macroCaloriesRough(meal.macros);
  let calories = meal.calories;
  if (rough > 0 && !isMacroCalorieCoherent(calories, meal.macros)) {
    calories = Math.max(1, Math.min(3500, Math.round(rough)));
  }
  return {
    ...meal,
    calories,
    aiContext: buildAiContextFromRaw(parsed),
  };
}
