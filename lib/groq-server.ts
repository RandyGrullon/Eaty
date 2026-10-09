import {
  isDemoAi,
  demoCoachChat,
  demoCoachInsight,
  demoDiet,
  demoDishTutorial,
  demoFoodAnalysis,
  demoNutritionTips,
  demoWorkout,
} from "@/lib/demo/ai-fixtures";
import {
  buildFoodAnalysisUserPrompt,
  buildFoodTextRetryUserPrompt,
  buildFoodVisionRetryUserPrompt,
  buildNutritionTipsUserPrompt,
  buildCoachInsightsPrompt,
  buildWorkoutPrompt,
  buildDietGeneratePrompt,
  buildDietProcessPrompt,
  buildDishTutorialPrompt,
  getSystemFoodAnalysis,
  getSystemFoodTextRetry,
  getSystemFoodVisionRetry,
  getSystemNutritionTips,
  getSystemCoachInsights,
  getSystemWorkout,
  getSystemDietGenerate,
  getSystemDietProcess,
  getSystemDishTutorial,
  SYSTEM_JSON_REPAIR,
  type CoachContext,
} from "@/lib/food-analysis-prompts";
import { coachInsightSchema, type CoachInsight } from "@/lib/coach-schema";
import {
  generatedWorkoutSchema,
  type GeneratedWorkout,
} from "@/types/workout";
import {
  generatedDietSchema,
  dishTutorialSchema,
  type GeneratedDiet,
  type DishTutorial,
} from "@/types/diet";
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

/**
 * Modelos por defecto (llama-4-scout fue retirado de Groq):
 * - visión (fotos): Qwen 3.8, con imágenes y modo JSON.
 * - texto (coach, consejos, dietas, recetas, rutinas): GPT-OSS 120B.
 * Separarlos reparte los límites por minuto del plan gratuito entre dos modelos.
 */
const DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";
const DEFAULT_TEXT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_TIMEOUT_MS = 60_000;

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY no está configurada en el servidor.");
  }
  return key;
}

function hasImageContent(messages: ChatMessage[]): boolean {
  return messages.some(
    (m) => Array.isArray(m.content) && m.content.some((part) => part.type === "image_url")
  );
}

/**
 * El modelo de visión gratuito de Groq admite ~1000 tokens de salida por minuto:
 * pedir más hace que Groq rechace la llamada (429). El JSON del análisis cabe de sobra.
 */
function capMaxTokens(messages: ChatMessage[], requested: number): number {
  if (!hasImageContent(messages)) return requested;
  const cap = parseInt(process.env.GROQ_VISION_MAX_TOKENS ?? "", 10);
  return Math.min(requested, Number.isFinite(cap) && cap > 0 ? cap : 900);
}

/** Modelo según la petición: con imagen → visión; solo texto → modelo de texto. */
function getModel(messages: ChatMessage[] = []): string {
  if (hasImageContent(messages)) {
    return process.env.GROQ_MODEL?.trim() || DEFAULT_VISION_MODEL;
  }
  return process.env.GROQ_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;
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

/** Espera sugerida por Groq en un 429 (cabecera retry-after o "try again in Xs"), máx. 25 s. */
function retryAfterMs(res: Response, message: string): number {
  const header = Number.parseFloat(res.headers.get("retry-after") ?? "");
  const fromText = /try again in ([\d.]+)s/i.exec(message)?.[1];
  const seconds = Number.isFinite(header) ? header : fromText ? Number.parseFloat(fromText) : 2;
  return Math.min(Math.max(seconds * 1000 + 250, 500), 25_000);
}

async function groqChatCompletion(params: {
  messages: ChatMessage[];
  responseFormatJson?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const model = getModel(params.messages);
  const body: Record<string, unknown> = {
    model,
    messages: params.messages,
    // Más determinista para análisis nutricional (antes 0.35).
    temperature: params.temperature ?? 0.2,
    // Aumentado para alojar el JSON con componentBreakdown y referencias.
    max_tokens: capMaxTokens(params.messages, params.maxTokens ?? 2800),
    top_p: 0.9,
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
        const err = new Error(`Groq ${res.status} (${model}): ${safeOneLine(msg || "Error")}`);
        logger.error("Groq API error", { status: res.status, model, message: msg });
        lastErr = err;
        if (attempt < maxAttempts && isRetryableGroqError(err.message)) {
          // En 429 Groq indica cuánto esperar (límite de tokens por minuto).
          const backoff =
            res.status === 429 ? retryAfterMs(res, msg) : 400 * Math.pow(2, attempt - 1);
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
  } (calorías coherentes con 4P+4C+9G+2×fibra). Claves (SIEMPRE en inglés, nunca en español): visibleComponents, dishDescription, portionHypothesis, confidence, foodName, calories, macros { protein, carbs, fat, fiber, sugar }, recommendations. Solo los valores de texto en español.\n\nEntrada:\n${invalidJson.slice(0, 12000)}`;

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
    temperature: 0.15,
    maxTokens: 2800,
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
    temperature: 0.2,
    maxTokens: 2800,
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
    temperature: 0.2,
    maxTokens: 2800,
  });
  return parseFoodAnalysisContent(content);
}

export async function runGroqChat(params: {
  messages: ChatMessage[];
  responseFormatJson?: boolean;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  if (isDemoAi()) {
    const last = [...params.messages].reverse().find((m) => m.role === "user");
    const text = typeof last?.content === "string" ? last.content : "";
    return demoCoachChat(text);
  }
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
  if (isDemoAi()) return demoFoodAnalysis(params);
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
      temperature: 0.2,
      maxTokens: 2800,
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
  if (isDemoAi()) return demoNutritionTips();
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

export async function runCoachInsightsGroq(params: {
  context?: CoachContext;
  todayMeals: Array<{ foodName: string; calories: number }>;
  remainingCalories?: number;
  remainingProtein?: number;
  lang?: string;
}): Promise<CoachInsight> {
  if (isDemoAi()) return demoCoachInsight();
  const userText = buildCoachInsightsPrompt({
    context: params.context,
    todayMeals: params.todayMeals,
    remainingCalories: params.remainingCalories,
    remainingProtein: params.remainingProtein,
  });

  const content = await groqChatCompletion({
    messages: [
      { role: "system", content: getSystemCoachInsights(params.lang) },
      { role: "user", content: userText },
    ],
    responseFormatJson: true,
    temperature: 0.5,
    maxTokens: 700,
  });

  try {
    return coachInsightSchema.parse(parseJsonObject<unknown>(content));
  } catch {
    const repaired = await groqChatCompletion({
      messages: [
        { role: "system", content: SYSTEM_JSON_REPAIR },
        {
          role: "user",
          content: [
            "Devuelve solo JSON válido con esta forma exacta:",
            '{"focusTitle":"...","focusMessage":"...","nextMeal":{"title":"...","idea":"...","approxCalories":0},"training":{"title":"...","idea":"..."},"motivation":"..."}',
            "Entrada defectuosa:",
            content.slice(0, 3000),
          ].join("\n"),
        },
      ],
      responseFormatJson: true,
      temperature: 0.2,
      maxTokens: 700,
    });
    return coachInsightSchema.parse(parseJsonObject<unknown>(repaired));
  }
}

export async function runWorkoutGroq(params: {
  goal?: "bulking" | "shedding" | "maintenance";
  level: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  equipment?: string[];
  focus?: string;
  lang?: string;
}): Promise<GeneratedWorkout> {
  if (isDemoAi()) return demoWorkout();
  const userText = buildWorkoutPrompt({
    goal: params.goal,
    level: params.level,
    daysPerWeek: params.daysPerWeek,
    equipment: params.equipment,
    focus: params.focus,
  });

  const content = await groqChatCompletion({
    messages: [
      { role: "system", content: getSystemWorkout(params.lang) },
      { role: "user", content: userText },
    ],
    responseFormatJson: true,
    temperature: 0.5,
    maxTokens: 2200,
  });

  try {
    return generatedWorkoutSchema.parse(parseJsonObject<unknown>(content));
  } catch {
    const repaired = await groqChatCompletion({
      messages: [
        { role: "system", content: SYSTEM_JSON_REPAIR },
        {
          role: "user",
          content: [
            "Devuelve solo JSON válido de una rutina con la forma del esquema pedido.",
            "Entrada defectuosa:",
            content.slice(0, 4000),
          ].join("\n"),
        },
      ],
      responseFormatJson: true,
      temperature: 0.2,
      maxTokens: 2200,
    });
    return generatedWorkoutSchema.parse(parseJsonObject<unknown>(repaired));
  }
}

/** Genera JSON validado por un schema Zod, con un reintento de reparación. */
async function generateValidatedJson<T>(params: {
  system: string;
  user: string;
  schema: { parse: (x: unknown) => T };
  maxTokens: number;
  temperature?: number;
  repairHint: string;
}): Promise<T> {
  const content = await groqChatCompletion({
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
    responseFormatJson: true,
    temperature: params.temperature ?? 0.5,
    maxTokens: params.maxTokens,
  });
  try {
    return params.schema.parse(parseJsonObject<unknown>(content));
  } catch {
    const repaired = await groqChatCompletion({
      messages: [
        { role: "system", content: SYSTEM_JSON_REPAIR },
        {
          role: "user",
          content: `${params.repairHint}\n\nEntrada defectuosa:\n${content.slice(0, 5000)}`,
        },
      ],
      responseFormatJson: true,
      temperature: 0.2,
      maxTokens: params.maxTokens,
    });
    return params.schema.parse(parseJsonObject<unknown>(repaired));
  }
}

export async function runDietGenerateGroq(params: {
  goal?: string;
  calories?: number;
  preferences?: string;
  restrictions?: string[];
  lang?: string;
}): Promise<GeneratedDiet> {
  if (isDemoAi()) return demoDiet(JSON.stringify(params));
  return generateValidatedJson({
    system: getSystemDietGenerate(params.lang),
    user: buildDietGeneratePrompt(params),
    schema: generatedDietSchema,
    maxTokens: 2600,
    repairHint:
      "Devuelve solo JSON válido de una dieta con la forma del esquema pedido.",
  });
}

export async function runDietProcessGroq(params: {
  name?: string;
  description?: string;
  goal?: string;
  dishes: Array<{ name: string; type: string; description?: string }>;
  lang?: string;
}): Promise<GeneratedDiet> {
  if (isDemoAi()) return demoDiet(JSON.stringify(params));
  return generateValidatedJson({
    system: getSystemDietProcess(params.lang),
    user: buildDietProcessPrompt(params),
    schema: generatedDietSchema,
    maxTokens: 2600,
    repairHint:
      "Devuelve solo JSON válido de la dieta completada, respetando los platos del usuario.",
  });
}

export async function runDishTutorialGroq(params: {
  dishName: string;
  description?: string;
  servings?: number;
  lang?: string;
}): Promise<DishTutorial> {
  if (isDemoAi()) return demoDishTutorial(params.dishName);
  return generateValidatedJson({
    system: getSystemDishTutorial(params.lang),
    user: buildDishTutorialPrompt(params),
    schema: dishTutorialSchema,
    maxTokens: 2800,
    repairHint:
      "Devuelve solo JSON válido del tutorial con la forma del esquema pedido.",
  });
}

