import type { FoodAnalysisAiContext } from "@/lib/food-analysis-schema";

/** Etiqueta y estilo para el nivel de confianza del análisis de la IA. */
export function confidenceLabel(
  c: FoodAnalysisAiContext["confidence"]
): { text: string; className: string } {
  switch (c) {
    case "high":
      return {
        text: "Alta",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      };
    case "medium":
      return {
        text: "Media",
        className: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
      };
    case "low":
    default:
      return {
        text: "Baja",
        className: "bg-muted text-muted-foreground",
      };
  }
}
