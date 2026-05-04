import { describe, expect, it } from "vitest";
import {
  buildMealFromAnalyzedRaw,
  foodAnalysisRawSchema,
  isMacroCalorieCoherent,
  nutritionTipsResponseSchema,
  toMealFields,
} from "@/lib/food-analysis-schema";

const minimalRaw = {
  visibleComponents: ["arroz"],
  dishDescription: "Arroz con pollo",
  portionHypothesis: { relativeSize: "medium" as const },
  confidence: "high" as const,
  foodName: "Arroz con pollo",
  calories: 500,
  macros: {
    protein: 30,
    carbs: 60,
    fat: 10,
    fiber: 3,
    sugar: 2,
  },
  recommendations: ["a", "b", "c"],
};

describe("nutritionTipsResponseSchema", () => {
  it("parsea consejos estructurados", () => {
    const raw = {
      tips: [
        {
          whatToChange: "Sustituye la bebida azucarada por agua con gas y limón",
          whereApply: "En el almuerzo con el menú que registraste hoy",
          whyItHelps: "Menos calorías líquidas y menos pico glucémico.",
          recipeSearchQuery: "bebidas sin azúcar caseras limón",
          miniSteps: [
            "Prepara una jarra con agua, gas, rodajas de limón y menta.",
            "Guarda la bebida en nevera y sirve en vaso alto con hielo.",
          ],
        },
        {
          whatToChange: "Añade una ensalada verde antes del plato principal",
          whereApply: "En la cena, antes de servir carbohidrato",
          recipeSearchQuery: "ensalada verde vinagreta simple",
          miniSteps: [
            "Lava y seca lechuga o rúcula.",
            "Aliña con aceite, limón y sal en el bol antes de mezclar.",
          ],
        },
        {
          whatToChange: "Reduce el pan a una sola rebanada tostada",
          whereApply: "En el desayuno registrado",
          whyItHelps: "Recorta carbohidrato refinado fácilmente.",
          recipeSearchQuery: "desayuno proteína huevo aguacate",
          miniSteps: [
            "Tuesta solo una rebanada y acompaña con huevo o yogur.",
            "Si tienes hambre, suma tomate o pepino en rodajas.",
          ],
        },
      ],
    };
    const parsed = nutritionTipsResponseSchema.parse(raw);
    expect(parsed.tips).toHaveLength(3);
    expect(parsed.tips[0].recipeSearchQuery).toContain("bebidas");
  });
});

describe("food-analysis-schema", () => {
  it("parses minimal valid raw analysis", () => {
    const parsed = foodAnalysisRawSchema.parse(minimalRaw);
    expect(parsed.foodName).toBe("Arroz con pollo");
  });

  it("toMealFields rounds macros", () => {
    const raw = foodAnalysisRawSchema.parse(minimalRaw);
    const meal = toMealFields(raw);
    expect(meal.calories).toBe(500);
    expect(meal.macros.protein).toBe(30);
  });

  it("isMacroCalorieCoherent allows rough match", () => {
    const ok = isMacroCalorieCoherent(500, {
      protein: 25,
      carbs: 50,
      fat: 12,
      fiber: 2,
      sugar: 1,
    });
    expect(ok).toBe(true);
  });

  it("buildMealFromAnalyzedRaw incluye aiContext coherente con el raw", () => {
    const raw = foodAnalysisRawSchema.parse({
      ...minimalRaw,
      cuisineOrStyle: "Criollo",
    });
    const meal = buildMealFromAnalyzedRaw(raw);
    expect(meal.aiContext).toBeDefined();
    expect(meal.aiContext?.dishDescription).toBe("Arroz con pollo");
    expect(meal.aiContext?.confidence).toBe("high");
    expect(meal.aiContext?.visibleComponents).toContain("arroz");
    expect(meal.aiContext?.cuisineOrStyle).toBe("Criollo");
  });

  it("buildMealFromAnalyzedRaw alinea kcal a los gramos si el modelo se contradice", () => {
    const raw = foodAnalysisRawSchema.parse({
      ...minimalRaw,
      calories: 50,
    });
    const meal = buildMealFromAnalyzedRaw(raw);
    const rough =
      4 * meal.macros.protein +
      4 * meal.macros.carbs +
      9 * meal.macros.fat +
      2 * meal.macros.fiber;
    expect(meal.calories).toBe(Math.round(rough));
  });
});
