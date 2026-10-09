import { describe, it, expect } from "vitest";
import { INGREDIENT_CATALOG, EXAMPLE_INGREDIENT_IDS, getCatalogIngredient, makeCustomIngredient } from "./catalog";
import { calculateTargets, calculateBmr } from "./targets";
import { DietPlannerService, DietPlanError, generateDietPlan } from "./planner";
import { householdLabel } from "./recipes";
import { solveGrams } from "./solver";
import type { BodyMetrics, DietGoalInput } from "./types";

const exampleFoods = EXAMPLE_INGREDIENT_IDS.map((id) => getCatalogIngredient(id)!);

/** Ejemplo del brief: bajar 15–20 lb en 51 días (7 semanas) con ayuno 16/8. */
const body: BodyMetrics = {
  weightKg: 95,
  heightCm: 178,
  age: 34,
  sex: "male",
  activityLevel: "moderate",
  bodyFatPct: 28,
  skeletalMuscleKg: 38,
};
const goal: DietGoalInput = { lossLbs: 17, durationDays: 51, protocol: "if_16_8" };

describe("catálogo", () => {
  it("todos los alimentos tienen kcal coherentes con sus macros (±25 %)", () => {
    for (const i of INGREDIENT_CATALOG) {
      const { kcal, protein, fat, netCarbs, fiber } = i.per100g;
      const estimate = protein * 4 + fat * 9 + netCarbs * 4 + fiber * 2;
      expect(Math.abs(estimate - kcal) / kcal, i.id).toBeLessThan(0.25);
    }
  });

  it("crea ingredientes propios con id estable", () => {
    const c = makeCustomIngredient({ name: "Pechuga de pavo", category: "protein", kcal: 110, protein: 24, fat: 1, netCarbs: 0 });
    expect(c.id).toBe("custom-pechuga-de-pavo");
    expect(c.custom).toBe(true);
  });
});

describe("metas", () => {
  it("usa Katch-McArdle con % de grasa y Mifflin sin él", () => {
    expect(calculateBmr(body).method).toBe("katch_mcardle");
    const { bodyFatPct: _bf, skeletalMuscleKg: _smm, ...plain } = body;
    expect(calculateBmr(plain).method).toBe("mifflin");
    expect(calculateBmr({ ...body, bmrOverride: 1900 }).bmr).toBe(1900);
  });

  it("limita el déficit a ~1 % del peso por semana y avisa", () => {
    const t = calculateTargets(body, goal, exampleFoods);
    // 17 lb en 51 días pide ~1167 kcal/día; 1 % de 95 kg/semana ≈ 1047 kcal/día.
    expect(t.dailyDeficit).toBeLessThanOrEqual(1050);
    expect(t.warnings.some((w) => w.level === "warning")).toBe(true);
    expect(t.projectedDays).toBeGreaterThan(51);
    expect(t.style).toBe("low_carb");
    expect(t.protein).toBeGreaterThanOrEqual(145);
  });

  it("respeta el mínimo de kcal", () => {
    const t = calculateTargets({ ...body, weightKg: 60, sex: "female", activityLevel: "sedentary", bodyFatPct: 30 }, { lossLbs: 30, durationDays: 30, protocol: "three_meals" }, exampleFoods);
    expect(t.kcal).toBeGreaterThanOrEqual(1200);
  });
});

describe("solver", () => {
  it("encuentra gramos que cumplen proteína y kcal", () => {
    const chicken = getCatalogIngredient("chicken-breast")!;
    const rice = getCatalogIngredient("white-rice")!;
    const oil = getCatalogIngredient("olive-oil")!;
    const g = solveGrams([chicken, rice, oil], { protein: 50, fat: 15, netCarbs: 60, kcal: 600 });
    const protein = (g[0] * 22.5 + g[1] * 7.1) / 100;
    const kcal = (g[0] * 120 + g[1] * 365 + g[2] * 884) / 100;
    expect(protein).toBeGreaterThan(45);
    expect(Math.abs(kcal - 600)).toBeLessThan(60);
  });
});

describe("DietPlannerService", () => {
  const plan = generateDietPlan(exampleFoods, body, goal, 7);

  it("genera 7 días con 2 comidas (16/8)", () => {
    expect(plan.days).toHaveLength(7);
    for (const d of plan.days) expect(d.meals).toHaveLength(2);
  });

  it("usa solo los alimentos permitidos", () => {
    const allowed = new Set(EXAMPLE_INGREDIENT_IDS);
    for (const d of plan.days)
      for (const m of d.meals)
        for (const ing of m.recipe.ingredients) expect(allowed.has(ing.ingredientId)).toBe(true);
  });

  it("cada día cuadra kcal (±8 %) y proteína (≥ 92 %)", () => {
    for (const d of plan.days) {
      expect(Math.abs(d.totals.kcal - plan.targets.kcal) / plan.targets.kcal).toBeLessThan(0.08);
      expect(d.totals.protein).toBeGreaterThanOrEqual(plan.targets.protein * 0.92);
    }
  });

  it("rota la proteína dentro del día", () => {
    for (const d of plan.days) {
      const ids = d.meals.map((m) => m.recipe.ingredients[0].ingredientId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("cada receta trae gramos, pasos con tiempo y trucos", () => {
    const r = plan.days[0].meals[0].recipe;
    expect(r.ingredients.every((i) => i.grams > 0)).toBe(true);
    expect(r.steps.length).toBeGreaterThanOrEqual(3);
    expect(r.steps.some((s) => (s.minutes ?? 0) > 0)).toBe(true);
    expect(r.hiddenCalorieTips.length).toBeGreaterThan(0);
    expect(r.seasoning.length).toBeGreaterThan(0);
  });

  it("con carbohidratos y 3 comidas incluye desayuno equilibrado", () => {
    const foods = ["chicken-breast", "eggs", "oats", "white-rice", "broccoli", "olive-oil", "banana"].map((id) => getCatalogIngredient(id)!);
    const p = generateDietPlan(foods, body, { ...goal, protocol: "three_meals" }, 3);
    expect(p.targets.style).toBe("balanced");
    expect(p.days[0].meals[0].label).toBe("Desayuno");
    for (const d of p.days) expect(Math.abs(d.totals.kcal - p.targets.kcal) / p.targets.kcal).toBeLessThan(0.1);
  });

  it("exige al menos una proteína", () => {
    expect(() => new DietPlannerService([getCatalogIngredient("broccoli")!], body, goal)).toThrow(DietPlanError);
  });
});

describe("medidas caseras", () => {
  it("convierte gramos a unidades legibles", () => {
    expect(householdLabel(getCatalogIngredient("eggs")!, 150)).toBe("≈ 3 huevos grandes");
    expect(householdLabel(getCatalogIngredient("butter")!, 21)).toBe("≈ 1 1/2 cda");
    expect(householdLabel(getCatalogIngredient("avocado")!, 70)).toBe("≈ 1/2 aguacate");
  });
});
