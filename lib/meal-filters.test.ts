import { describe, it, expect } from "vitest";
import { filterMeals } from "@/hooks/use-meal-filters";
import type { Meal } from "@/types/meal";

function makeMeal(overrides: Partial<Meal>): Meal {
  return {
    id: Math.random().toString(36).slice(2),
    imageUrl: null,
    foodName: "Plato",
    calories: 300,
    macros: { protein: 10, carbs: 30, fat: 10, fiber: 2, sugar: 5 },
    recommendations: [],
    createdAt: new Date(),
    ...overrides,
  };
}

describe("filterMeals — búsqueda", () => {
  const meals = [
    makeMeal({ foodName: "Ensalada César", recommendations: ["Añade más fibra"] }),
    makeMeal({ foodName: "Pizza", aiContext: { confidence: "high", componentBreakdown: [{ name: "mozzarella" }] } as Meal["aiContext"] }),
    makeMeal({ foodName: "Sopa" }),
  ];

  it("busca por nombre", () => {
    const r = filterMeals(meals, { period: "all", query: "pizza", calorieRange: "all" });
    expect(r).toHaveLength(1);
    expect(r[0].foodName).toBe("Pizza");
  });

  it("busca también en recomendaciones", () => {
    const r = filterMeals(meals, { period: "all", query: "fibra", calorieRange: "all" });
    expect(r).toHaveLength(1);
    expect(r[0].foodName).toBe("Ensalada César");
  });

  it("busca en el contexto de la IA (componentes)", () => {
    const r = filterMeals(meals, { period: "all", query: "mozzarella", calorieRange: "all" });
    expect(r).toHaveLength(1);
    expect(r[0].foodName).toBe("Pizza");
  });

  it("query vacía no filtra", () => {
    const r = filterMeals(meals, { period: "all", query: "   ", calorieRange: "all" });
    expect(r).toHaveLength(3);
  });
});

describe("filterMeals — calorías", () => {
  const meals = [
    makeMeal({ calories: 150 }),
    makeMeal({ calories: 350 }),
    makeMeal({ calories: 700 }),
  ];

  it("low: < 200", () => {
    expect(filterMeals(meals, { period: "all", query: "", calorieRange: "low" })).toHaveLength(1);
  });
  it("mid: 200–500", () => {
    expect(filterMeals(meals, { period: "all", query: "", calorieRange: "mid" })).toHaveLength(1);
  });
  it("high: >= 500", () => {
    expect(filterMeals(meals, { period: "all", query: "", calorieRange: "high" })).toHaveLength(1);
  });
});

describe("filterMeals — periodo", () => {
  it("'all' devuelve todo; 'day' excluye comidas antiguas", () => {
    const old = makeMeal({ createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10) });
    const todayMeal = makeMeal({ createdAt: new Date() });
    const meals = [old, todayMeal];

    expect(filterMeals(meals, { period: "all", query: "", calorieRange: "all" })).toHaveLength(2);

    const day = filterMeals(meals, { period: "day", query: "", calorieRange: "all" });
    expect(day).toHaveLength(1);
    expect(day[0].id).toBe(todayMeal.id);
  });
});
