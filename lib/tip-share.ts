import type { PersonalizedNutritionTip } from "@/lib/food-analysis-schema";

/** Convierte un consejo nutricional en texto plano para compartir/copiar. */
export function formatTipForShare(tip: PersonalizedNutritionTip): string {
  const lines = [
    `🔧 Qué cambiar: ${tip.whatToChange}`,
    `📍 Dónde aplicarlo: ${tip.whereApply}`,
    ...(tip.whyItHelps ? [`💡 Por qué ayuda: ${tip.whyItHelps}`] : []),
    "",
    `📖 Receta: ${tip.recipe.title}`,
    "Ingredientes:",
    ...tip.recipe.ingredients.map((ing) => `- ${ing}`),
    "",
    "Pasos:",
    ...tip.recipe.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "Consejo de Eaty",
  ];
  return lines.join("\n");
}

/**
 * Comparte un consejo usando la Web Share API o, si no está disponible, lo copia
 * al portapapeles. Devuelve qué acción ocurrió; lanza si ambas fallan.
 */
export async function shareNutritionTip(
  tip: PersonalizedNutritionTip
): Promise<"shared" | "copied"> {
  const text = formatTipForShare(tip);
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({
      title: "Consejo nutricional — Eaty",
      text,
      url: window.location.href,
    });
    return "shared";
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
