import type { FoodAnalysisAiContext } from "@/lib/food-analysis-schema";

/** Etiqueta y estilo para el nivel de confianza del análisis de la IA. */
export function confidenceLabel(
  c: FoodAnalysisAiContext["confidence"]
): { text: string; className: string } {
  switch (c) {
    case "high":
      return {
        text: "Alta",
        className: "bg-success/15 text-success",
      };
    case "medium":
      return {
        text: "Media",
        className: "bg-warning/20 text-warning-foreground dark:text-warning",
      };
    case "low":
    default:
      return {
        text: "Baja",
        className: "bg-muted text-muted-foreground",
      };
  }
}
