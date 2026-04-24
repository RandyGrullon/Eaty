import type { FoodAnalysisMealFields } from "@/lib/food-analysis-schema";
import { macroCaloriesRough } from "@/lib/food-analysis-schema";
import { logger } from "@/lib/logger";

/**
 * Placa tipo ~450 kcal, calorías = suma aprox. de macros (coherente con el esquema de la app).
 */
function coherentPlateEstimate(): FoodAnalysisMealFields {
  const protein = 22;
  const carbs = 45;
  const fat = 14;
  const fiber = 6;
  const sugar = 4;
  const macros = { protein, carbs, fat, fiber, sugar };
  const calories = Math.round(macroCaloriesRough(macros));
  return { foodName: "Plato", calories, macros, recommendations: [] };
}

type FallbackParams = {
  imageBase64?: string;
  imageMimeType?: string;
  foodName?: string;
  description?: string;
};

/**
 * @param err — opcional, solo se registra en consola
 */
export function buildFoodAnalysisFallback(
  params: FallbackParams,
  err?: unknown
): FoodAnalysisMealFields {
  if (err) {
    logger.error("Análisis Groq: usando estimación de respaldo", err);
  }

  const fromName = params.foodName?.trim();
  const fromDesc = params.description?.trim();
  const hasText = Boolean(fromName || fromDesc);
  const hasImage = Boolean(params.imageBase64?.trim());

  const base = coherentPlateEstimate();
  const label =
    fromName && fromName.length > 0
      ? fromName.length > 120
        ? fromName.slice(0, 117) + "…"
        : fromName
      : fromDesc
        ? fromDesc.length > 100
          ? fromDesc.slice(0, 97) + "…"
          : fromDesc
        : hasImage
          ? "Comida en foto (estimación aproximada)"
          : "Comida (estimación aproximada)";

  const recommendations: string[] = [
    "Estimación generada sin el modelo de IA: revisa y ajusta los valores a tu criterio.",
    "Puedes volver a analizar en unos minutos si el servicio se restablece.",
  ];
  if (hasText) {
    recommendations.push("Basado en el nombre o descripción que indicaste.");
  } else if (hasImage) {
    recommendations.push(
      "Solo a partir de la imagen, sin visión: los números son un punto de partida muy aproximado."
    );
  } else {
    recommendations.push("Indica el nombre o una foto nítida para análisis más afinado.");
  }

  return {
    ...base,
    foodName: label,
    recommendations: recommendations.slice(0, 5),
  };
}
