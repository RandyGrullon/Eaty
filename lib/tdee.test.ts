import { describe, expect, it } from "vitest";
import { calculateTDEEPrecise } from "@/lib/tdee";

describe("calculateTDEEPrecise", () => {
  it("returns positive TDEE for male moderate", () => {
    const r = calculateTDEEPrecise({
      age: 30,
      gender: "male",
      weight: 75,
      height: 180,
      activityLevel: "moderate",
      fitnessGoal: "maintenance",
    });
    expect(r.tdee).toBeGreaterThan(1500);
    expect(r.dailyCalories).toBeGreaterThan(0);
    expect(r.explanation.length).toBeGreaterThan(0);
  });
});
