import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminAppProjectIdForDiagnostics,
  getAdminAuth,
  getAdminFirestore,
  isFirebaseServiceAccountJsonConfigured,
} from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { isPremiumUser } from "@/lib/subscription-server";
import { getCookieValueFromRequest } from "@/lib/parse-cookie-header";
import { EATY_SERVER_SESSION_COOKIE } from "@/lib/server-auth-session-constants";
import {
  QUOTA_SPECS,
  dailyQuotaLimit,
  quotaExceededMessage,
  refundedCount,
  type QuotaKind,
} from "@/lib/quota-config";

export type { QuotaKind };

export class HttpApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpApiError";
    this.status = status;
  }
}

function getBearerIdToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  const t = h.slice(7).trim();
  return t.length > 0 ? t : null;
}

function getSessionCookieRaw(req: Request): string | null {
  return getCookieValueFromRequest(req, EATY_SERVER_SESSION_COOKIE);
}

function logAuthFailure(label: string, e: unknown): void {
  const code =
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "string"
      ? (e as { code: string }).code
      : null;
  const message = e instanceof Error ? e.message : String(e);
  logger.error(label, code ? `${code}: ${message}` : message);
}

/**
 * Comprueba el usuario: `Authorization: Bearer` (ID token) y/o cookie HttpOnly
 * creada por POST /api/auth/session. Así el análisis funciona aunque el token
 * en cabecera esté vencido pero la cookie de sesión siga vigente, o vía
 * `credentials: 'include'` sin depender del header.
 */
/** Demo sin Firebase Admin: todas las peticiones son del usuario de ejemplo. */
function isDemoServer(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1" && !isFirebaseServiceAccountJsonConfigured();
}

export async function requireUidFromRequest(req: Request): Promise<string> {
  if (isDemoServer()) return "demo-user";
  const bearer = getBearerIdToken(req);
  const sessionCookie = getSessionCookieRaw(req);
  const auth = getAdminAuth();

  if (bearer) {
    try {
      return await auth.verifyIdToken(bearer, true).then((d) => d.uid);
    } catch (e) {
      if (!sessionCookie) {
        logAuthFailure("verifyIdToken", e);
      }
    }
  }

  if (sessionCookie) {
    try {
      return await auth.verifySessionCookie(sessionCookie, true).then((d) => d.uid);
    } catch (e) {
      logAuthFailure("verifySessionCookie", e);
    }
  } else if (!bearer) {
    logAuthErrorOnce(
      "Sin credenciales: añade Authorization: Bearer, cookie eaty_session o inicia sesión otra vez."
    );
  }

  const base = "Sesión inválida o expirada. Vuelve a iniciar sesión.";
  if (process.env.NODE_ENV === "development") {
    const adminP = getAdminAppProjectIdForDiagnostics();
    const fromEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    const hasServiceJson = isFirebaseServiceAccountJsonConfigured();
    const hint = !hasServiceJson
      ? " (dev) Falta FIREBASE_SERVICE_ACCOUNT_JSON en .env: el backend no valida el token. Consola: Service accounts > generar clave, pegar en .env, reiniciar dev."
      : fromEnv && adminP && fromEnv !== adminP
        ? ` (dev) Cuenta de servicio: project_id=${adminP} ≠ NEXT_PUBLIC=${fromEnv} — usan el mismo JSON y cliente.`
        : ` (dev) Revisa el log "verifyIdToken" / "verifySessionCookie"; el Admin está en project_id=${adminP ?? "?"}.`;
    throw new HttpApiError(401, `${base}${hint}`);
  }

  throw new HttpApiError(401, base);
}

function logAuthErrorOnce(detail: string): void {
  if (process.env.NODE_ENV === "development") {
    logger.error("requireUidFromRequest", detail);
  }
}

function usageDayKeyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export type QuotaReservation = {
  kind: QuotaKind;
  /** Devuelve la unidad reservada (best effort, nunca deja el contador negativo). */
  refund: () => Promise<void>;
};

/**
 * Reserva una unidad de la cuota diaria (UTC) ANTES de llamar al LLM: la
 * transacción incrementa el contador y rechaza con 429 si se supera el límite.
 * Si la llamada posterior falla, usa `refund()` (o `withDailyQuota`) para devolverla.
 * Escritura solo desde servidor (Admin); reglas Firestore deniegan write cliente en `usage`.
 */
export async function reserveDailyQuota(
  uid: string,
  kind: QuotaKind
): Promise<QuotaReservation> {
  if (isDemoServer()) return { kind, refund: async () => undefined };
  const db = getAdminFirestore();
  const ref = db.doc(`users/${uid}/usage/${usageDayKeyUtc()}`);
  const isPremium = await isPremiumUser(uid);
  const limit = dailyQuotaLimit(kind, isPremium);
  const { field } = QUOTA_SPECS[kind];

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.data() ?? {};
    const count = typeof d[field] === "number" ? (d[field] as number) : 0;
    if (count >= limit) {
      throw new HttpApiError(429, quotaExceededMessage(kind, limit, isPremium));
    }
    tx.set(
      ref,
      { [field]: count + 1, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  });

  let refunded = false;
  return {
    kind,
    refund: async () => {
      if (refunded) return;
      refunded = true;
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists) return;
          tx.set(
            ref,
            {
              [field]: refundedCount(snap.data()?.[field]),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        });
      } catch (e) {
        logger.error("refund quota", e);
      }
    },
  };
}

/**
 * Reserva cuota, ejecuta `fn` (la llamada al LLM) y devuelve la reserva si `fn` lanza.
 */
export async function withDailyQuota<T>(
  uid: string,
  kind: QuotaKind,
  fn: () => Promise<T>
): Promise<T> {
  const reservation = await reserveDailyQuota(uid, kind);
  try {
    return await fn();
  } catch (e) {
    await reservation.refund();
    throw e;
  }
}

/** @deprecated Usa `withDailyQuota` (reserva antes + devolución si falla). */
export async function enforceDailyQuota(
  uid: string,
  kind: QuotaKind
): Promise<void> {
  await reserveDailyQuota(uid, kind);
}
