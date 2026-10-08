import { describe, it, expect } from "vitest";
import { deriveLastDays } from "./week-chart";
import type { Meal } from "@/types/meal";

const meal = (createdAt: Date, calories: number, isPlanned = false): Meal => ({
  id: String(Math.random()),
  imageUrl: null,
  foodName: "x",
  calories,
  macros: { protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
  recommendations: [],
  isPlanned,
  createdAt,
});

describe("deriveLastDays", () => {
  const now = new Date(2026, 9, 8, 15, 0);

  it("devuelve 7 días terminando hoy", () => {
    const bars = deriveLastDays([], 7, now);
    expect(bars).toHaveLength(7);
    expect(bars[6].isToday).toBe(true);
    expect(bars[0].date.getDate()).toBe(2);
  });

  it("suma calorías por día e ignora planificadas y fuera de rango", () => {
    const bars = deriveLastDays(
      [
        meal(new Date(2026, 9, 8, 9), 400),
        meal(new Date(2026, 9, 8, 13), 600),
        meal(new Date(2026, 9, 7, 20), 500),
        meal(new Date(2026, 9, 8, 21), 900, true),
        meal(new Date(2026, 8, 20, 12), 700),
      ],
      7,
      now
    );
    expect(bars[6].calories).toBe(1000);
    expect(bars[6].meals).toBe(2);
    expect(bars[5].calories).toBe(500);
    expect(bars.reduce((a, b) => a + b.calories, 0)).toBe(1500);
  });
});
