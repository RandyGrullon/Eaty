import { describe, it, expect } from "vitest";
import { generatedDietSchema, dishTutorialSchema } from "@/types/diet";
import { generatedWorkoutSchema } from "@/types/workout";
import { coachInsightSchema } from "@/lib/coach-schema";

describe("generatedDietSchema", () => {
  const valid = {
    name: "Plan equilibrado",
    description: "Una dieta variada",
    goal: "balanced",
    tags: ["sano"],
    targetCalories: 2000,
    targetMacros: { protein: 150, carbs: 200, fat: 60 },
    dishes: [
      { name: "Avena", type: "breakfast", description: "", calories: 400, macros: { protein: 20, carbs: 60, fat: 8 } },
      { name: "Pollo y arroz", type: "lunch", description: "", calories: 700, macros: { protein: 55, carbs: 70, fat: 18 } },
      { name: "Salmón", type: "dinner", description: "", calories: 600, macros: { protein: 45, carbs: 30, fat: 30 } },
    ],
  };

  it("acepta una dieta válida", () => {
    expect(generatedDietSchema.parse(valid).dishes).toHaveLength(3);
  });

  it("rechaza una dieta sin platos suficientes", () => {
    expect(() =>
      generatedDietSchema.parse({ ...valid, dishes: [] })
    ).toThrow();
  });
});

describe("dishTutorialSchema", () => {
  it("aplica defaults y valida pasos", () => {
    const t = dishTutorialSchema.parse({
      ingredients: [{ item: "Huevo", amount: "2 unidades" }],
      steps: [
        { n: 1, title: "Batir", detail: "Bate los huevos en un bol." },
        { n: 2, title: "Cocinar", detail: "Cocina a fuego medio hasta cuajar." },
      ],
    });
    expect(t.servings).toBe(1);
    expect(t.difficulty).toBe("easy");
    expect(t.steps).toHaveLength(2);
  });

  it("rechaza tutoriales con un solo paso", () => {
    expect(() =>
      dishTutorialSchema.parse({
        ingredients: [{ item: "Huevo", amount: "2" }],
        steps: [{ n: 1, title: "Uno", detail: "Solo un paso aquí." }],
      })
    ).toThrow();
  });
});

describe("generatedWorkoutSchema", () => {
  it("acepta una rutina válida con defaults", () => {
    const w = generatedWorkoutSchema.parse({
      title: "Full body",
      goal: "Fuerza general",
      daysPerWeek: 3,
      level: "beginner",
      days: [
        {
          day: "Día 1",
          exercises: [{ name: "Sentadilla", sets: 4, reps: "8-12", restSec: 60 }],
        },
      ],
    });
    expect(w.warmup).toEqual([]);
    expect(w.days[0].exercises[0].name).toBe("Sentadilla");
  });
});

describe("coachInsightSchema", () => {
  const valid = {
    focusTitle: "Prioriza proteína",
    focusMessage: "Te faltan 50 g de proteína hoy.",
    nextMeal: { title: "Cena", idea: "Pollo con arroz integral" },
    training: { title: "Cardio suave", idea: "30 min de caminata" },
    motivation: "¡Vas genial!",
  };

  it("acepta un insight válido", () => {
    expect(coachInsightSchema.parse(valid).focusTitle).toBe("Prioriza proteína");
  });

  it("rechaza un insight sin nextMeal", () => {
    const { nextMeal, ...rest } = valid;
    expect(() => coachInsightSchema.parse(rest)).toThrow();
  });
});
