import { z } from "zod";

/** Momento del día al que pertenece un plato dentro de una dieta. */
export const dietMealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);
export type DietMealType = z.infer<typeof dietMealTypeSchema>;

export const DIET_MEAL_TYPE_ORDER: DietMealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export const DIET_MEAL_TYPE_LABEL: Record<DietMealType, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

/** Objetivo principal de la dieta. Alineado con `UserProfile.fitnessGoal` + estilos. */
export const dietGoalSchema = z.enum([
  "shedding", // pérdida de grasa / déficit
  "bulking", // ganancia muscular / volumen
  "maintenance", // mantenimiento
  "keto",
  "vegan",
  "vegetarian",
  "mediterranean",
  "high_protein",
  "balanced",
]);
export type DietGoal = z.infer<typeof dietGoalSchema>;

export const DIET_GOAL_LABEL: Record<DietGoal, string> = {
  shedding: "Pérdida de grasa",
  bulking: "Volumen muscular",
  maintenance: "Mantenimiento",
  keto: "Keto",
  vegan: "Vegana",
  vegetarian: "Vegetariana",
  mediterranean: "Mediterránea",
  high_protein: "Alta en proteína",
  balanced: "Equilibrada",
};

export const macrosSchema = z.object({
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});
export type DietMacros = z.infer<typeof macrosSchema>;

/** Un paso del tutorial, con datos opcionales de tiempo/temperatura. */
export const tutorialStepSchema = z.object({
  n: z.number().int().positive(),
  title: z.string().min(2).max(120),
  detail: z.string().min(8).max(900),
  tip: z.string().max(300).optional(),
  durationMin: z.number().min(0).max(600).optional(),
  tempC: z.number().min(0).max(400).optional(),
});
export type TutorialStep = z.infer<typeof tutorialStepSchema>;

export const tutorialIngredientSchema = z.object({
  item: z.string().min(1).max(120),
  amount: z.string().min(1).max(60),
});
export type TutorialIngredient = z.infer<typeof tutorialIngredientSchema>;

/** Tutorial paso a paso extremadamente detallado de un plato. */
export const dishTutorialSchema = z.object({
  servings: z.number().int().positive().max(20).default(1),
  prepTimeMin: z.number().min(0).max(600).default(0),
  cookTimeMin: z.number().min(0).max(600).default(0),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  equipment: z.array(z.string().min(1).max(80)).max(20).default([]),
  ingredients: z.array(tutorialIngredientSchema).min(1).max(40),
  steps: z.array(tutorialStepSchema).min(2).max(30),
  commonMistakes: z.array(z.string().min(4).max(300)).max(10).default([]),
  plating: z.string().max(600).optional(),
});
export type DishTutorial = z.infer<typeof dishTutorialSchema>;

export const DIFFICULTY_LABEL: Record<DishTutorial["difficulty"], string> = {
  easy: "Fácil",
  medium: "Media",
  hard: "Avanzada",
};

/** Un plato dentro de una dieta. El tutorial es opcional (se genera on-demand). */
export const dietDishSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(160),
  type: dietMealTypeSchema,
  description: z.string().max(500).default(""),
  imageUrl: z.string().url().nullable().optional(),
  calories: z.number().min(0).max(3500),
  macros: macrosSchema,
  tutorial: dishTutorialSchema.optional(),
});
export type DietDish = z.infer<typeof dietDishSchema>;

/** Documento de dieta (en `users/{uid}/diets/{id}`). */
export interface Diet {
  id: string;
  name: string;
  description: string;
  goal: DietGoal;
  tags: string[];
  imageUrl: string | null;
  targetCalories: number;
  targetMacros: DietMacros;
  dishes: DietDish[];
  createdBy: "ai" | "user";
  status: "draft" | "ready";
  createdAt: Date;
  updatedAt: Date;
}

/** Payload de IA al generar una dieta completa (sin ids ni fechas todavía). */
export const generatedDietSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(4).max(600),
  goal: dietGoalSchema,
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  targetCalories: z.number().min(800).max(6000),
  targetMacros: macrosSchema,
  dishes: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        type: dietMealTypeSchema,
        description: z.string().max(500).default(""),
        calories: z.number().min(0).max(3500),
        macros: macrosSchema,
      })
    )
    .min(3)
    .max(12),
});
export type GeneratedDiet = z.infer<typeof generatedDietSchema>;
