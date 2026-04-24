import {
  buildFoodAnalysisUserPrompt,
  buildNutritionTipsUserPrompt,
  SYSTEM_FOOD_ANALYSIS,
  SYSTEM_JSON_REPAIR,
  SYSTEM_NUTRITION_TIPS,
} from "@/lib/food-analysis-prompts";
import { buildFoodAnalysisFallback } from "@/lib/food-analysis-fallback";
import {
  foodAnalysisRawSchema,
  isMacroCalorieCoherent,
  nutritionTipsResponseSchema,
  toMealFields,
  type FoodAnalysisMealFields,
  type FoodAnalysisRaw,
} from "@/lib/food-analysis-schema";
import { logger } from "@/lib/logger";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY no está configurada en el servidor.");
  }
  return key;
}

function getModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

type ChatContentPart =
  | { type: "text"; text: string }
  | {
      type: "image_url";
      image_url: { url: string };
    };

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
};

type GroqChatResponse = {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string;
  }>;
  error?: { message?: string };
};

async function groqChatCompletion(params: {
  messages: ChatMessage[];
  responseFormatJson?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: getModel(),
    messages: params.messages,
    temperature: params.temperature ?? 0.35,
    max_tokens: params.maxTokens ?? 2048,
    top_p: 1,
    stream: false,
  };

  if (params.responseFormatJson) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getGroqApiKey()}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as GroqChatResponse;

  if (!res.ok) {
    const msg = data.error?.message ?? res.statusText;
    throw new Error(`Groq: ${msg}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Respuesta vacía del modelo.");
  }

  return content.trim();
}

function parseJsonObject<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("No se pudo interpretar JSON del modelo.");
  }
}

function validateFoodAnalysis(raw: unknown): FoodAnalysisRaw {
  return foodAnalysisRawSchema.parse(raw);
}

function validateMealCoherence(
  parsed: FoodAnalysisRaw
): FoodAnalysisMealFields {
  const meal = toMealFields(parsed);
  if (!isMacroCalorieCoherent(meal.calories, meal.macros)) {
    throw new Error("Incoherencia entre calorías y macros.");
  }
  return meal;
}

async function repairFoodJson(invalidJson: string): Promise<FoodAnalysisMealFields> {
  const content = await groqChatCompletion({
    messages: [
      { role: "system", content: SYSTEM_JSON_REPAIR },
      {
        role: "user",
        content: `El siguiente JSON no cumple el esquema o la coherencia nutricional (calorías ≈ 4P+4C+9F+2*fibra con tolerancia ~35%). Devuelve un único objeto JSON válido con: visibleComponents, dishDescription, portionHypothesis (objeto con relativeSize small|medium|large y notes opcional, o un string con la hipótesis), confidence, foodName, calories, macros {protein,carbs,fat,fiber,sugar}, recommendations. Textos al usuario en español.\n\nEntrada:\n${invalidJson.slice(0, 12000)}`,
      },
    ],
    responseFormatJson: true,
    temperature: 0.2,
    maxTokens: 2048,
  });
  const obj = parseJsonObject<unknown>(content);
  const parsed = validateFoodAnalysis(obj);
  return validateMealCoherence(parsed);
}

function parseFoodAnalysisContent(content: string): FoodAnalysisMealFields {
  const obj = parseJsonObject<unknown>(content);
  const parsed = validateFoodAnalysis(obj);
  return validateMealCoherence(parsed);
}

export async function runFoodAnalysisGroq(params: {
  imageBase64?: string;
  imageMimeType?: string;
  foodName?: string;
  description?: string;
}): Promise<FoodAnalysisMealFields> {
  try {
    const hasImage = Boolean(params.imageBase64);
    const userText = buildFoodAnalysisUserPrompt({
      hasImage,
      foodName: params.foodName,
      description: params.description,
    });

    const userContent: ChatContentPart[] = [{ type: "text", text: userText }];

    if (params.imageBase64) {
      const mime = params.imageMimeType?.startsWith("image/")
        ? params.imageMimeType
        : "image/jpeg";
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mime};base64,${params.imageBase64}`,
        },
      });
    }

    const content = await groqChatCompletion({
      messages: [
        { role: "system", content: SYSTEM_FOOD_ANALYSIS },
        { role: "user", content: userContent },
      ],
      responseFormatJson: true,
      temperature: 0.35,
      maxTokens: 2048,
    });

    try {
      return parseFoodAnalysisContent(content);
    } catch (firstErr) {
      try {
        return await repairFoodJson(content);
      } catch (repairErr) {
        const primary =
          firstErr instanceof Error ? firstErr : new Error(String(firstErr));
        logger.error("Análisis: reparar JSON", repairErr);
        return buildFoodAnalysisFallback(params, primary);
      }
    }
  } catch (e) {
    logger.error("Análisis Groq", e);
    return buildFoodAnalysisFallback(params, e);
  }
}

export async function runNutritionTipsGroq(params: {
  meals: Array<{
    foodName: string;
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
  }>;
  totalCalories: number;
  dailyGoal?: number;
  recentSummary?: string;
}): Promise<string[]> {
  const userText = buildNutritionTipsUserPrompt(
    params.meals,
    params.totalCalories,
    params.dailyGoal,
    params.recentSummary
  );

  try {
    const content = await groqChatCompletion({
      messages: [
        { role: "system", content: SYSTEM_NUTRITION_TIPS },
        { role: "user", content: userText },
      ],
      responseFormatJson: true,
      temperature: 0.55,
      maxTokens: 800,
    });

    try {
      const obj = parseJsonObject<unknown>(content);
      const { tips } = nutritionTipsResponseSchema.parse(obj);
      return tips;
    } catch {
      const repaired = await groqChatCompletion({
        messages: [
          { role: "system", content: SYSTEM_JSON_REPAIR },
          {
            role: "user",
            content: `Devuelve solo {"tips":["..."]} en español, 3 a 5 strings. Entrada defectuosa:\n${content.slice(0, 4000)}`,
          },
        ],
        responseFormatJson: true,
        temperature: 0.2,
        maxTokens: 600,
      });
      const obj = parseJsonObject<unknown>(repaired);
      const { tips } = nutritionTipsResponseSchema.parse(obj);
      return tips;
    }
  } catch (e) {
    logger.error("Consejos Groq (respaldo fijo)", e);
    return [
      "Hidrátate a lo largo del día, sobre todo cerca de las comidas principales.",
      "Incluye proteína y vegetales en al menos una comida principal hoy.",
      "Si notas bajón de energía, revisa si espaciaste mucho el tiempo sin comer.",
    ];
  }
}
