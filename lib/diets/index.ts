export * from "./db";
export * from "./ai";

import { buildDishImageUrl, buildDishPrompt } from "@/lib/dish-image";
import type { GeneratedDiet } from "@/types/diet";
import type { NewDiet } from "./db";

/** Hash determinista para que la imagen de un plato sea estable por nombre. */
function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 1_000_000;
}

/**
 * URL de imagen (Pollinations) estable para un plato de dieta a partir de su
 * nombre. Misma entrada → misma imagen, sin necesidad de persistirla.
 */
export function dietDishImageUrl(name: string, descriptor?: string): string {
  const prompt = buildDishPrompt({
    foodName: descriptor ? `${name}, ${descriptor}` : name,
  });
  return buildDishImageUrl(prompt, seedFromString(name));
}

function newDishId(i: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${i}-${Math.floor(Math.random() * 1e6)}`;
}

/** Convierte la dieta generada por IA en un documento guardable (con ids/imágenes). */
export function generatedToNewDiet(
  g: GeneratedDiet,
  createdBy: "ai" | "user",
  status: "draft" | "ready"
): NewDiet {
  return {
    name: g.name,
    description: g.description,
    goal: g.goal,
    tags: g.tags,
    imageUrl: dietDishImageUrl(g.dishes[0]?.name ?? g.name),
    targetCalories: g.targetCalories,
    targetMacros: g.targetMacros,
    dishes: g.dishes.map((d, i) => ({
      id: newDishId(i),
      name: d.name,
      type: d.type,
      description: d.description,
      imageUrl: dietDishImageUrl(d.name),
      calories: d.calories,
      macros: d.macros,
    })),
    createdBy,
    status,
  };
}
