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
  const parts: string[] = [`professional food photography of ${meal.foodName.trim()}`];

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
 * Origen público de la app para que las URLs funcionen también fuera del navegador
 * (p. ej. la app móvil). En el navegador basta con el origen actual.
 */
function publicOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/**
 * URL de la imagen IA del plato, servida por `/api/dish-image` (proxy a Pollinations
 * con reintentos, cola y caché). `seed` permite regenerar variaciones del mismo plato.
 */
export function buildDishImageUrl(prompt: string, seed: number): string {
  const params = new URLSearchParams({ p: prompt, s: String(seed) });
  return `${publicOrigin()}/api/dish-image?${params.toString()}`;
}

/** Conveniencia: prompt + URL con una semilla aleatoria. */
export function generateDishImageUrl(
  meal: DishImageContext,
  seed: number = Math.floor(Math.random() * 1_000_000)
): string {
  return buildDishImageUrl(buildDishPrompt(meal), seed);
}
