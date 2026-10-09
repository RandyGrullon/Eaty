/**
 * Diet Builder: planificar la dieta a partir de los alimentos que el usuario
 * decide comer. Modelo de datos (Zod + tipos) compartido por el motor y la UI.
 */
import { z } from "zod";

/* ───────────────────────── Ingredientes ───────────────────────── */

export const ingredientCategorySchema = z.enum(["protein", "carb", "fat", "vegetable"]);
export type IngredientCategory = z.infer<typeof ingredientCategorySchema>;

export const INGREDIENT_CATEGORY_LABEL: Record<IngredientCategory, string> = {
  protein: "Proteínas",
  carb: "Carbohidratos",
  fat: "Grasas",
  vegetable: "Verduras",
};

/** Nutrición por 100 g del alimento tal como se pesa (normalmente en crudo). */
export const nutrientsPer100Schema = z.object({
  kcal: z.number().min(0).max(900),
  protein: z.number().min(0).max(100),
  fat: z.number().min(0).max(100),
  /** Carbohidratos netos (totales − fibra). */
  netCarbs: z.number().min(0).max(100),
  fiber: z.number().min(0).max(100).default(0),
});
export type NutrientsPer100 = z.infer<typeof nutrientsPer100Schema>;

export const cookingMethodSchema = z.enum([
  "plancha",
  "sarten",
  "horno",
  "hervido",
  "vapor",
  "salteado",
  "crudo",
]);
export type CookingMethod = z.infer<typeof cookingMethodSchema>;

/** Cómo se cocina el alimento: alimenta el tutorial paso a paso. */
export const cookingProfileSchema = z.object({
  method: cookingMethodSchema,
  /** "fuego medio-alto", "horno 200 °C"... */
  heat: z.string().max(60),
  tempC: z.number().min(0).max(300).optional(),
  minutes: z.number().min(0).max(120),
  /** Temperatura interna segura / punto (proteínas). */
  doneness: z.string().max(160).optional(),
  /** Indicación breve de preparación previa. */
  prep: z.string().max(200).optional(),
});
export type CookingProfile = z.infer<typeof cookingProfileSchema>;

export const mealSlotSchema = z.enum(["breakfast", "main", "snack"]);
export type MealSlot = z.infer<typeof mealSlotSchema>;

/** Alimento permitido (del catálogo o creado por el usuario). */
export const allowedIngredientSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().min(1).max(80),
  category: ingredientCategorySchema,
  per100g: nutrientsPer100Schema,
  /** Medida casera de referencia: "1 huevo grande" = 50 g. */
  household: z
    .object({ label: z.string().min(1).max(40), grams: z.number().positive().max(1000) })
    .optional(),
  /** Gramos mínimos/máximos razonables por comida. */
  portion: z.object({ min: z.number().min(0), max: z.number().positive(), step: z.number().positive() }),
  /** En qué tipo de comida encaja (desayuno, principal, snack). */
  slots: z.array(mealSlotSchema).min(1),
  cooking: cookingProfileSchema,
  /** Nombre del plato cuando es el protagonista: "Salmón a la plancha". */
  dishName: z.string().max(80).optional(),
  custom: z.boolean().optional(),
});
export type AllowedIngredient = z.infer<typeof allowedIngredientSchema>;

/* ───────────────────────── Objetivo ───────────────────────── */

export const sexSchema = z.enum(["male", "female", "other"]);
export const activityLevelSchema = z.enum(["sedentary", "light", "moderate", "active", "very_active"]);

/** Datos antropométricos (los opcionales mejoran la precisión). */
export const bodyMetricsSchema = z.object({
  weightKg: z.number().min(30).max(350),
  heightCm: z.number().min(120).max(230),
  age: z.number().int().min(14).max(100),
  sex: sexSchema,
  activityLevel: activityLevelSchema,
  bodyFatPct: z.number().min(3).max(70).optional(),
  skeletalMuscleKg: z.number().min(10).max(80).optional(),
  /** TMB medida (báscula de bioimpedancia / calorimetría); sustituye la estimación. */
  bmrOverride: z.number().min(800).max(4500).optional(),
});
export type BodyMetrics = z.infer<typeof bodyMetricsSchema>;

export const mealProtocolSchema = z.enum(["if_16_8", "three_meals", "four_meals"]);
export type MealProtocol = z.infer<typeof mealProtocolSchema>;

export const MEAL_PROTOCOL_LABEL: Record<MealProtocol, string> = {
  if_16_8: "Ayuno 16/8 · 2 comidas",
  three_meals: "3 comidas",
  four_meals: "3 comidas + snack",
};

export const dietGoalInputSchema = z.object({
  /** Libras a perder (0 = mantener). */
  lossLbs: z.number().min(0).max(150),
  /** Duración deseada en días. */
  durationDays: z.number().int().min(7).max(730),
  protocol: mealProtocolSchema,
});
export type DietGoalInput = z.infer<typeof dietGoalInputSchema>;

/* ───────────────────────── Resultado ───────────────────────── */

export type MacroTotals = {
  kcal: number;
  protein: number;
  fat: number;
  netCarbs: number;
  fiber: number;
};

export type PlanWarning = { level: "info" | "warning"; message: string };

/** Metas diarias calculadas. */
export type DietTargets = {
  bmr: number;
  bmrMethod: "measured" | "katch_mcardle" | "mifflin";
  leanMassKg: number;
  tdee: number;
  dailyDeficit: number;
  kcal: number;
  protein: number;
  fat: number;
  netCarbs: number;
  /** Libras por semana esperadas con este déficit. */
  weeklyLossLbs: number;
  /** Días que tomaría llegar a la meta con el déficit aplicado. */
  projectedDays: number;
  /** "low_carb" si el usuario no eligió fuentes de carbohidrato. */
  style: "low_carb" | "balanced";
  warnings: PlanWarning[];
};

export type RecipeIngredient = {
  ingredientId: string;
  name: string;
  grams: number;
  household?: string;
  nutrition: MacroTotals;
};

export type RecipeStep = {
  n: number;
  title: string;
  detail: string;
  minutes?: number;
  tempC?: number;
  tip?: string;
};

/** Plato del plan: gramajes, nutrición y tutorial. */
export type Recipe = {
  id: string;
  name: string;
  slot: MealSlot;
  ingredients: RecipeIngredient[];
  nutrition: MacroTotals;
  prepMinutes: number;
  cookMinutes: number;
  equipment: string[];
  seasoning: string[];
  steps: RecipeStep[];
  hiddenCalorieTips: string[];
  plating: string;
};

export type PlannedMeal = {
  /** "Comida 1", "Desayuno"... */
  label: string;
  /** Hora sugerida "13:00". */
  time: string;
  kcalShare: number;
  target: MacroTotals;
  recipe: Recipe;
};

export type DayPlan = {
  day: number;
  meals: PlannedMeal[];
  totals: MacroTotals;
};

/** Plan completo generado por el `DietPlannerService`. */
export type DietPlan = {
  goal: DietGoalInput;
  body: BodyMetrics;
  targets: DietTargets;
  ingredients: AllowedIngredient[];
  days: DayPlan[];
  createdAt: string;
};
