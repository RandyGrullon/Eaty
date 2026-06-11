import { z } from "zod";
import { appFirebase } from "@/lib/firebase";
import type { FoodAnalysisMealFields } from "@/lib/food-analysis-schema";

/**
 * Cliente del backend existente (las API routes de la web Next.js).
 * El backend ya acepta `Authorization: Bearer <idToken>` (ver lib/api-auth-usage.ts
 * en el repo raíz), así que la app móvil reutiliza el mismo análisis IA,
 * cuotas free/premium incluidas.
 */
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 429 sobre la cuota free: la UI debe llevar al paywall. */
export function isQuotaError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 429;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!API_BASE) {
    throw new ApiError(
      0,
      "Falta EXPO_PUBLIC_API_BASE_URL en mobile/.env (URL del backend Eaty, ej. https://eaty.app)."
    );
  }
  const user = appFirebase.auth.currentUser;
  if (!user) throw new ApiError(401, "Inicia sesión para continuar.");
  const token = await user.getIdToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

/**
 * Forma que devuelve POST /api/analyze-food: el meal ya procesado por el
 * servidor (`FoodAnalysisMealFields` con kcal reconciliadas), no el JSON
 * crudo del modelo.
 */
const analyzedMealSchema = z.object({
  foodName: z.string().min(1),
  calories: z.number().nonnegative(),
  macros: z.object({
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
    fiber: z.number().nonnegative().default(0),
    sugar: z.number().nonnegative().default(0),
  }),
  recommendations: z.array(z.string()).default([]),
  aiContext: z
    .object({
      dishDescription: z.string(),
      visibleComponents: z.array(z.string()).default([]),
      confidence: z.enum(["low", "medium", "high"]),
      portionLabel: z.string(),
      cuisineOrStyle: z.string().optional(),
      cookingClues: z.string().optional(),
      ambiguityNotes: z.string().optional(),
      containerType: z.string().optional(),
      referenceObjects: z.array(z.string()).optional(),
      estimatedWeightGrams: z.number().optional(),
      componentBreakdown: z
        .array(
          z.object({
            name: z.string(),
            estimatedGrams: z.number().optional(),
            calories: z.number().optional(),
          })
        )
        .optional(),
    })
    .optional(),
});

export type AnalyzeFoodInput = {
  imageBase64?: string;
  imageMimeType?: string;
  foodName?: string;
  description?: string;
  allergens?: string[];
  lang?: string;
};

export async function analyzeFood(
  input: AnalyzeFoodInput
): Promise<FoodAnalysisMealFields> {
  const res = await authedFetch("/api/analyze-food", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `Error del servidor (${res.status}).`;
    throw new ApiError(res.status, message);
  }
  const parsed = analyzedMealSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(500, "Respuesta de análisis inválida del servidor.");
  }
  return parsed.data as FoodAnalysisMealFields;
}
