import type { Meal } from "@/types/meal";

/** Datos mínimos del plato necesarios para construir el prompt de imagen. */
export type DishImageContext = Pick<Meal, "foodName"> & {
  aiContext?: Meal["aiContext"];
};

/**
 * Construye un prompt de fotografía de comida a partir del contexto del plato.
 * Usa el nombre + lo que la IA dedujo (porción, recipiente, componentes).
 */
export function buildDishPrompt(meal: DishImageContext): string {
  const parts: string[] = [
    "professional food photography of",
    meal.foodName,
  ];

  const ai = meal.aiContext;
  if (ai?.portionLabel) parts.push(`portion: ${ai.portionLabel}`);
  if (ai?.containerType) parts.push(`served in ${ai.containerType}`);
  if (ai?.componentBreakdown?.length) {
    const names = ai.componentBreakdown
      .map((c) => c?.name)
      .filter(Boolean)
      .slice(0, 5)
      .join(", ");
    if (names) parts.push(`with ${names}`);
  }

  parts.push(
    "appetizing, natural soft lighting, top-down, shallow depth of field, high detail, realistic, on a clean table"
  );

  return parts.join(", ");
}

/**
 * URL de imagen generada por Pollinations.ai (gratis, sin API key).
 * `seed` permite regenerar variaciones del mismo plato.
 */
export function buildDishImageUrl(prompt: string, seed: number): string {
  const encoded = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    width: "768",
    height: "768",
    nologo: "true",
    model: "flux",
    seed: String(seed),
  });
  return `https://image.pollinations.ai/prompt/${encoded}?${params.toString()}`;
}

/** Conveniencia: prompt + URL con una semilla aleatoria. */
export function generateDishImageUrl(
  meal: DishImageContext,
  seed: number = Math.floor(Math.random() * 1_000_000)
): string {
  return buildDishImageUrl(buildDishPrompt(meal), seed);
}
