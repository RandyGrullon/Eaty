import { describe, expect, it } from "vitest";
import {
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
});
