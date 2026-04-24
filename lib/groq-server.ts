import {
  buildFoodAnalysisUserPrompt,
  buildFoodTextRetryUserPrompt,
  buildFoodVisionRetryUserPrompt,
  buildNutritionTipsUserPrompt,
  SYSTEM_FOOD_ANALYSIS,
  SYSTEM_FOOD_TEXT_RETRY,
  SYSTEM_FOOD_VISION_RETRY,
  SYSTEM_JSON_REPAIR,
  SYSTEM_NUTRITION_TIPS,
} from "@/lib/food-analysis-prompts";
import {
  buildMealFromAnalyzedRaw,
  foodAnalysisRawSchema,
  nutritionTipsResponseSchema,
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

function imageDataUrl(
  imageBase64: string,
  imageMimeType: string | undefined
): string {
  const mime = imageMimeType?.startsWith("image/")
    ? imageMimeType
    : "image/jpeg";
  return `data:${mime};base64,${imageBase64}`;
}

/**
 * Repara JSON: si hubo imagen, el modelo vuelve a verla (no solo el texto roto).
 */
async function repairFoodJson(
  invalidJson: string,
  vision: { imageBase64: string; imageMimeType?: string } | null
): Promise<FoodAnalysisMealFields> {
  const baseText = `El siguiente JSON no cumple el esquema o faltan campos. ${
    vision
      ? "Mira de nuevo la IMAGEN del plato y rehace el JSON completo con estimaciones acordes a lo que ves (cada plato es distinto)."
      : "Devuelve un JSON válido."
  } (calorías coherentes con 4P+4C+9G+2×fibra). Claves: visibleComponents, dishDescription, portionHypothesis, confidence, foodName, calories, macros, recommendations. Textos en español.\n\nEntrada:\n${invalidJson.slice(0, 12000)}`;

  const userContent: ChatContentPart[] = vision
    ? [
        { type: "text", text: baseText },
        {
          type: "image_url",
          image_url: { url: imageDataUrl(vision.imageBase64, vision.imageMimeType) },
        },
      ]
    : [{ type: "text", text: baseText }];

  const content = await groqChatCompletion({
    messages: [
      { role: "system", content: SYSTEM_JSON_REPAIR },
      { role: "user", content: userContent },
    ],
    responseFormatJson: true,
    temperature: 0.2,
    maxTokens: 2048,
  });
  const obj = parseJsonObject<unknown>(content);
  const parsed = validateFoodAnalysis(obj);
  return buildMealFromAnalyzedRaw(parsed);
}

function parseFoodAnalysisContent(content: string): FoodAnalysisMealFields {
  const obj = parseJsonObject<unknown>(content);
  const parsed = validateFoodAnalysis(obj);
  return buildMealFromAnalyzedRaw(parsed);
}

function buildImageUserContent(params: {
  systemForUser: string;
  imageBase64: string;
  imageMimeType?: string;
}): ChatContentPart[] {
  return [
    { type: "text", text: params.systemForUser },
    {
      type: "image_url",
      image_url: {
        url: imageDataUrl(params.imageBase64, params.imageMimeType),
      },
    },
  ];
}

async function runVisionRetryPass(params: {
  imageBase64: string;
  imageMimeType?: string;
}): Promise<FoodAnalysisMealFields> {
  const userContent = buildImageUserContent({
    systemForUser: buildFoodVisionRetryUserPrompt(),
    imageBase64: params.imageBase64,
    imageMimeType: params.imageMimeType,
  });
  const content = await groqChatCompletion({
    messages: [
      { role: "system", content: SYSTEM_FOOD_VISION_RETRY },
      { role: "user", content: userContent },
    ],
    responseFormatJson: true,
    temperature: 0.3,
    maxTokens: 2048,
  });
  return parseFoodAnalysisContent(content);
}

async function runTextRetryPass(params: {
  foodName?: string;
  description?: string;
}): Promise<FoodAnalysisMealFields> {
  const userText = buildFoodTextRetryUserPrompt({
    foodName: params.foodName,
    description: params.description,
  });
  const content = await groqChatCompletion({
    messages: [
      { role: "system", content: SYSTEM_FOOD_TEXT_RETRY },
      { role: "user", content: userText },
    ],
    responseFormatJson: true,
    temperature: 0.3,
    maxTokens: 2048,
  });
  return parseFoodAnalysisContent(content);
}

export class FoodAnalysisExhaustedError extends Error {
  constructor(cause?: unknown) {
    super(
      "No se pudo obtener un análisis nutricional. Reintenta o comprueba GROQ_API_KEY y el tamaño de la imagen."
    );
    this.name = "FoodAnalysisExhaustedError";
    if (cause && cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export async function runFoodAnalysisGroq(params: {
  imageBase64?: string;
  imageMimeType?: string;
  foodName?: string;
  description?: string;
}): Promise<FoodAnalysisMealFields> {
  const hasImage = Boolean(params.imageBase64?.trim());
  const userText = buildFoodAnalysisUserPrompt({
    hasImage,
    foodName: params.foodName,
    description: params.description,
  });

  const userContent: ChatContentPart[] = hasImage
    ? buildImageUserContent({
        systemForUser: userText,
        imageBase64: params.imageBase64!,
        imageMimeType: params.imageMimeType,
      })
    : [{ type: "text", text: userText }];

  const visionForRepair = hasImage
    ? {
        imageBase64: params.imageBase64!,
        imageMimeType: params.imageMimeType,
      }
    : null;

  let content: string;
  try {
    content = await groqChatCompletion({
      messages: [
        { role: "system", content: SYSTEM_FOOD_ANALYSIS },
        { role: "user", content: userContent },
      ],
      responseFormatJson: true,
      temperature: 0.35,
      maxTokens: 2048,
    });
  } catch (e) {
    logger.error("Análisis Groq: primera llamada", e);
    if (hasImage) {
      try {
        return await runVisionRetryPass({
          imageBase64: params.imageBase64!,
          imageMimeType: params.imageMimeType,
        });
      } catch (e2) {
        logger.error("Análisis Groq: reintento visión", e2);
        throw new FoodAnalysisExhaustedError(e2);
      }
    }
    try {
      return await runTextRetryPass({
        foodName: params.foodName,
        description: params.description,
      });
    } catch (e2) {
      throw new FoodAnalysisExhaustedError(e);
    }
  }

  try {
    return parseFoodAnalysisContent(content);
  } catch (firstErr) {
    try {
      return await repairFoodJson(content, visionForRepair);
    } catch (repairErr) {
      logger.error("Análisis: reparar JSON", repairErr);
      if (hasImage) {
        try {
          return await runVisionRetryPass({
            imageBase64: params.imageBase64!,
            imageMimeType: params.imageMimeType,
          });
        } catch (retryVisErr) {
          logger.error("Análisis: reintento visión", retryVisErr);
        }
      } else {
        const hasTextInput = Boolean(
          params.foodName?.trim() || params.description?.trim()
        );
        if (hasTextInput) {
          try {
            return await runTextRetryPass({
              foodName: params.foodName,
              description: params.description,
            });
          } catch (retryTextErr) {
            logger.error("Análisis: reintento texto", retryTextErr);
          }
        }
      }
      const primary =
        firstErr instanceof Error ? firstErr : new Error(String(firstErr));
      throw new FoodAnalysisExhaustedError(primary);
    }
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
