import { timingSafeEqual } from "node:crypto";

/**
 * Compara dos secretos en tiempo constante (solo servidor).
 * Si las longitudes difieren devuelve `false` sin llamar a `timingSafeEqual`
 * (que lanzaría); compara igualmente contra sí mismo para no filtrar por tiempo.
 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
