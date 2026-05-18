import {
  buildFoodAnalysisUserPrompt,
  buildFoodTextRetryUserPrompt,
  buildFoodVisionRetryUserPrompt,
  buildNutritionTipsUserPrompt,
  getSystemFoodAnalysis,
  getSystemFoodTextRetry,
  getSystemFoodVisionRetry,
  getSystemNutritionTips,
  SYSTEM_JSON_REPAIR,
} from "@/lib/food-analysis-prompts";
import {
  buildMealFromAnalyzedRaw,
  foodAnalysisRawSchema,
  nutritionTipsResponseSchema,
  type PersonalizedNutritionTip,
  type FoodAnalysisMealFields,
  type FoodAnalysisRaw,
} from "@/lib/food-analysis-schema";
import { logger } from "@/lib/logger";
import { STATIC_TIPS_ERROR } from "@/lib/nutrition-tip-defaults";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const DEFAULT_TIMEOUT_MS = 60_000;

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

function getTimeoutMs(): number {
  const raw = process.env.GROQ_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 3000) return DEFAULT_TIMEOUT_MS;
  return Math.min(60_000, n);
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

function safeOneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableGroqError(message: string): boolean {
  // Errores típicos transitorios: 429/5xx/timeouts
  return (
    /\bGroq\s+(429|500|502|503|504)\b/.test(message) ||
    /timeout/i.test(message) ||
    /temporarily|try again|rate limit/i.test(message)
  );
}

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

  const timeoutMs = getTimeoutMs();

  const maxAttempts = 3;
  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(GROQ_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getGroqApiKey()}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const rawText = await res.text();
      const data: GroqChatResponse = (() => {
        try {
          return JSON.parse(rawText) as GroqChatResponse;
        } catch {
          return {};
        }
      })();

      if (!res.ok) {
        const msg = data.error?.message ?? rawText ?? res.statusText;
        const err = new Error(`Groq ${res.status} (${getModel()}): ${safeOneLine(msg || "Error")}`);
        logger.error("Groq API error", { status: res.status, model: getModel(), message: msg });
        lastErr = err;
        if (attempt < maxAttempts && isRetryableGroqError(err.message)) {
          const backoff = 400 * Math.pow(2, attempt - 1);
          await sleep(backoff);
          continue;
        }
        throw err;
      }

      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Respuesta vacía del modelo.");
      }

      return content.trim();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : String(e);
      const err =
        e instanceof Error
          ? e
          : new Error(`Groq error: ${safeOneLine(msg || "Error")}`);
      lastErr = err;
      const aborted =
        e instanceof Error &&
        // Node/undici suele dar AbortError; mantenemos genérico
        (e.name === "AbortError" || /aborted/i.test(e.message));
      const retryable = aborted || isRetryableGroqError(err.message);
      if (attempt < maxAttempts && retryable) {
        const backoff = 600 * Math.pow(2, attempt - 1);
        logger.warn("Groq retry", { attempt, reason: safeOneLine(err.message) });
        await sleep(backoff);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr ?? new Error("Groq: error desconocido");
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
  lang?: string;
}): Promise<FoodAnalysisMealFields> {
  const userContent = buildImageUserContent({
    systemForUser: buildFoodVisionRetryUserPrompt(params.lang),
    imageBase64: params.imageBase64,
    imageMimeType: params.imageMimeType,
  });
  const content = await groqChatCompletion({
    messages: [
      { role: "system", content: getSystemFoodVisionRetry(params.lang) },
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
  lang?: string;
}): Promise<FoodAnalysisMealFields> {
  const userText = buildFoodTextRetryUserPrompt({
    foodName: params.foodName,
    description: params.description,
    lang: params.lang,
  });
  const content = await groqChatCompletion({
    messages: [
      { role: "system", content: getSystemFoodTextRetry(params.lang) },
      { role: "user", content: userText },
    ],
    responseFormatJson: true,
    temperature: 0.3,
    maxTokens: 2048,
  });
  return parseFoodAnalysisContent(content);
}

export async function runGroqChat(params: {
  messages: ChatMessage[];
  responseFormatJson?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  return groqChatCompletion(params);
}

export class FoodAnalysisExhaustedError extends Error {
  constructor(cause?: unknown) {
    const causeMsg =
      cause instanceof Error && cause.message.trim()
        ? ` Causa: ${safeOneLine(cause.message)}`
        : "";
    super(
      `No se pudo obtener un análisis nutricional. Reintenta o comprueba GROQ_API_KEY y el tamaño de la imagen.${causeMsg}`
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
  allergens?: string[];
  lang?: string;
}): Promise<FoodAnalysisMealFields> {
  const hasImage = Boolean(params.imageBase64?.trim());
  const userText = buildFoodAnalysisUserPrompt({
    hasImage,
    foodName: params.foodName,
    description: params.description,
    allergens: params.allergens,
    lang: params.lang,
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
        { role: "system", content: getSystemFoodAnalysis(params.lang) },
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
          lang: params.lang,
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
        lang: params.lang,
      });
    } catch (e2) {
      throw new FoodAnalysisExhaustedError(e2);
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
            lang: params.lang,
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
              lang: params.lang,
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
  lang?: string;
}): Promise<PersonalizedNutritionTip[]> {
  const userText = buildNutritionTipsUserPrompt(
    params.meals,
    params.totalCalories,
    params.dailyGoal,
    params.recentSummary
  );

  try {
    const content = await groqChatCompletion({
      messages: [
        { role: "system", content: getSystemNutritionTips(params.lang) },
        { role: "user", content: userText },
      ],
      responseFormatJson: true,
      temperature: 0.55,
      maxTokens: 1600,
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
            content: [
              "Devuelve solo JSON válido con tips en español. Forma exacta:",
              '{"tips":[{"whatToChange":"...","whereApply":"...","whyItHelps":"...","recipeSearchQuery":"palabras clave","miniSteps":["paso1","paso2"]}]}',
              "3 a 5 objetos en tips. Cada miniSteps con 2 o 3 strings.",
              "Entrada defectuosa:",
              content.slice(0, 4000),
            ].join("\n"),
          },
        ],
        responseFormatJson: true,
        temperature: 0.2,
        maxTokens: 1200,
      });
      const obj = parseJsonObject<unknown>(repaired);
      const { tips } = nutritionTipsResponseSchema.parse(obj);
      return tips;
    }
  } catch (e) {
    logger.error("Consejos Groq (respaldo fijo)", e);
    return STATIC_TIPS_ERROR;
  }
}

