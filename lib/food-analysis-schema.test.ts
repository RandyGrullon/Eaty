import { describe, expect, it } from "vitest";
import {
  buildMealFromAnalyzedRaw,
  foodAnalysisRawSchema,
  isMacroCalorieCoherent,
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
