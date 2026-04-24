export const SYSTEM_FOOD_ANALYSIS = `Eres un nutricionista experto en estimación de porciones a partir de fotos y texto.
Debes seguir un orden mental estricto y reflejarlo en el JSON:
1) Observar la imagen y/o el texto del usuario ANTES de cualquier número.
2) Listar componentes visibles, describir el plato, inferir estilo de cocina solo si hay evidencia, y señales de cocción (frito, horneado, crudo, en salsa, etc.).
3) Anotar ambigüedades honestas (escala, oclusión, desenfoque).
4) Proponer hipótesis de porción (small/medium/large) y notas; si no hay referencia de escala, asume porción media típica de casa/restaurante y dilo en portionHypothesis.notes.
5) SOLO entonces estimar foodName (español), calories, macros y recommendations (español, 2-5 frases cortas y accionables).

Reglas anti-alucinación:
- Si no es comida o no se distingue, confidence=low, foodName honesto (ej. "No se identifica claramente comida") y estimaciones conservadoras.
- No inventes ingredientes no visibles salvo deducción muy razonable (ej. salsa en un taco); en ese caso ambiguityNotes debe explicarlo.
- Si el usuario da nombre o descripción, úsalo; si contradice levemente la imagen, prioriza el nombre del usuario salvo error evidente.

Salida: SOLO un objeto JSON válido con las claves exactas del esquema (inglés en claves). Sin markdown ni texto fuera del JSON.`;

export function buildFoodAnalysisUserPrompt(params: {
  hasImage: boolean;
  foodName?: string;
  description?: string;
}): string {
  const parts: string[] = [
    "Genera el JSON según el esquema acordado (observación primero, números después).",
    "Claves obligatorias: visibleComponents, dishDescription, portionHypothesis { relativeSize, notes? }, confidence, foodName, calories, macros { protein, carbs, fat, fiber, sugar }, recommendations.",
    "Opcionales: cuisineOrStyle, cookingClues, ambiguityNotes.",
  ];

  if (params.hasImage) {
    parts.push(
      "Hay imagen adjunta: identifica el plato y componentes solo con evidencia visual."
    );
  } else {
    parts.push(
      "No hay imagen: basa el análisis en el nombre y la descripción del usuario; asume porción media razonable y decláralo en ambiguityNotes."
    );
  }

  if (params.foodName?.trim()) {
    parts.push(`Nombre indicado por el usuario: "${params.foodName.trim()}".`);
  }
  if (params.description?.trim()) {
    parts.push(`Descripción adicional: "${params.description.trim()}".`);
  }

  return parts.join("\n");
}

export const SYSTEM_NUTRITION_TIPS = `Eres un coach nutricional breve y práctico.
Responde SOLO con un objeto JSON: {"tips":["...","..."]} con entre 3 y 5 consejos en español.
Cada consejo máximo 160 caracteres, personalizado según las comidas y totales que recibes.
Sin markdown ni texto fuera del JSON.`;

export function buildNutritionTipsUserPrompt(
  meals: Array<{
    foodName: string;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
  }>,
  totalCalories: number,
  dailyGoal: number | undefined,
  recentSummary: string | undefined
): string {
  const mealLines = meals
    .map(
      (m) =>
        `- ${m.foodName}: ${m.calories} kcal (P ${m.macros.protein}g, C ${m.macros.carbs}g, G ${m.macros.fat}g)`
    )
    .join("\n");

  const blocks = [
    "Comidas de hoy:",
    mealLines || "(ninguna registrada)",
    `Total calorías: ${totalCalories}`,
    dailyGoal != null ? `Meta calórica diaria: ${dailyGoal}` : "",
    recentSummary
      ? `Contexto reciente (última comida / foco): ${recentSummary}`
      : "",
  ];

  return blocks.filter(Boolean).join("\n");
}

export const SYSTEM_JSON_REPAIR = `Devuelve SOLO un objeto JSON que cumpla exactamente el esquema pedido por el usuario, sin markdown.
Corrige errores de tipos, campos faltantes o valores fuera de rango.`;
