import type { Meal } from "@/types/meal";
import { stripUndefined } from "@/lib/firestore-clean";

/** Campos de `Meal` que se persisten en Firestore (sin id/createdAt). */
export type MealDocFields = Omit<Meal, "id" | "createdAt">;

export function isDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:");
}

/**
 * Construye el documento de comida a guardar: solo campos conocidos (descarta
 * extras como `plannedDate`/`recordedAt`), sin `undefined` y sin data URLs
 * (las fotos van a Storage; un base64 puede superar el límite de 1 MiB).
 */
export function buildMealDocFields(input: MealDocFields): MealDocFields {
  const imageUrl =
    input.imageUrl && !isDataUrl(input.imageUrl) ? input.imageUrl : null;
  return stripUndefined({
    imageUrl,
    foodName: input.foodName,
    calories: input.calories,
    macros: input.macros,
    recommendations: input.recommendations ?? [],
    aiContext: input.aiContext,
    mood: input.mood,
    isPlanned: input.isPlanned ?? false,
  });
}

/** Convierte un data URL (base64) en `File`. Devuelve `null` si no es válido. */
export function dataUrlToFile(dataUrl: string, baseName = "photo"): File | null {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match || !match[2]) return null;
  const mime = match[1] || "image/jpeg";
  try {
    const binary = atob(match[3]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    return new File([bytes], `${baseName}.${ext}`, { type: mime });
  } catch {
    return null;
  }
}
