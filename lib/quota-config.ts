/**
 * Configuración pura de cuotas diarias por tipo de uso de IA (sin Firebase),
 * para poder testearla. La lógica transaccional vive en `api-auth-usage.ts`.
 */

export type QuotaKind = "analyze" | "tips" | "coach" | "diets";

type QuotaSpec = {
  /** Campo contador en `users/{uid}/usage/{díaUTC}`. */
  field: string;
  freeEnv: string;
  freeDefault: number;
  premiumEnv: string;
  premiumDefault: number;
  /** Nombre en español para los mensajes de límite. */
  label: string;
};

export const QUOTA_SPECS: Record<QuotaKind, QuotaSpec> = {
  analyze: {
    field: "analyzeCount",
    freeEnv: "FREE_DAILY_ANALYZE_LIMIT",
    freeDefault: 5,
    premiumEnv: "DAILY_ANALYZE_LIMIT",
    premiumDefault: 120,
    label: "análisis",
  },
  tips: {
    field: "tipsCount",
    freeEnv: "FREE_DAILY_TIPS_LIMIT",
    freeDefault: 5,
    premiumEnv: "DAILY_TIPS_LIMIT",
    premiumDefault: 40,
    label: "consejos",
  },
  coach: {
    field: "coachCount",
    freeEnv: "FREE_DAILY_COACH_LIMIT",
    freeDefault: 15,
    premiumEnv: "DAILY_COACH_LIMIT",
    premiumDefault: 200,
    label: "consultas al coach",
  },
  diets: {
    field: "dietsCount",
    freeEnv: "FREE_DAILY_DIETS_LIMIT",
    freeDefault: 5,
    premiumEnv: "DAILY_DIETS_LIMIT",
    premiumDefault: 40,
    label: "operaciones de dietas",
  },
};

function envLimit(
  env: Record<string, string | undefined>,
  name: string,
  fallback: number
): number {
  const n = parseInt(env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Límite diario para un tipo de uso según el plan. */
export function dailyQuotaLimit(
  kind: QuotaKind,
  isPremium: boolean,
  env: Record<string, string | undefined> = process.env
): number {
  const spec = QUOTA_SPECS[kind];
  return isPremium
    ? envLimit(env, spec.premiumEnv, spec.premiumDefault)
    : envLimit(env, spec.freeEnv, spec.freeDefault);
}

/** Mensaje (es) cuando se alcanza el límite. */
export function quotaExceededMessage(
  kind: QuotaKind,
  limit: number,
  isPremium: boolean
): string {
  const { label } = QUOTA_SPECS[kind];
  return isPremium
    ? `Límite diario de ${label} (${limit}) alcanzado (UTC). Vuelve mañana.`
    : `Llegaste al límite gratuito de ${limit} ${label} por día. Pásate a Eaty Premium para ampliarlo.`;
}

/** Valor del contador tras devolver una reserva (nunca negativo). */
export function refundedCount(current: unknown): number {
  const n =
    typeof current === "number" && Number.isFinite(current) ? current : 0;
  return Math.max(0, n - 1);
}
