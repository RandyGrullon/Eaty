/**
 * Normalización de peso (kg) / altura (cm) del perfil.
 * Firestore puede contener números, strings numéricos o (datos antiguos) strings
 * cifrados en base64. La app trabaja siempre con números.
 */

/** Convierte a número positivo finito; si no se puede, `undefined`. */
export function parseMeasure(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

/** `true` si parece un valor cifrado antiguo (string no numérico). */
export function isLegacyEncryptedMeasure(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 16 &&
    parseMeasure(value) === undefined
  );
}

/**
 * Normaliza peso/altura, descifrando valores antiguos con `decrypt` si hace falta.
 */
export async function normalizeMeasure(
  value: unknown,
  decrypt: (cipher: string) => Promise<string>
): Promise<number | undefined> {
  if (isLegacyEncryptedMeasure(value)) {
    try {
      return parseMeasure(await decrypt(value));
    } catch {
      return undefined;
    }
  }
  return parseMeasure(value);
}
