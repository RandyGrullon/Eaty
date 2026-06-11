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
export async function requireUidFromRequest(req: Request): Promise<string> {
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

function envLimit(name: string, fallback: number): number {
  const n = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Límites por plan: free acotado (modelo de suscripción), premium amplio. */
function dailyAnalyzeLimit(isPremium: boolean): number {
  return isPremium
    ? envLimit("DAILY_ANALYZE_LIMIT", 120)
    : envLimit("FREE_DAILY_ANALYZE_LIMIT", 5);
}

function dailyTipsLimit(isPremium: boolean): number {
  return isPremium
    ? envLimit("DAILY_TIPS_LIMIT", 40)
    : envLimit("FREE_DAILY_TIPS_LIMIT", 5);
}

/**
 * Incrementa contador diario (UTC) y rechaza si supera el límite.
 * Escritura solo desde servidor (Admin); reglas Firestore deniegan write cliente en `usage`.
 */
export async function enforceDailyQuota(
  uid: string,
  kind: "analyze" | "tips"
): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.doc(`users/${uid}/usage/${usageDayKeyUtc()}`);
  const isPremium = await isPremiumUser(uid);
  const analyzeLimit = dailyAnalyzeLimit(isPremium);
  const tipsLimit = dailyTipsLimit(isPremium);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.data() ?? {};
    const analyzeCount =
      typeof d.analyzeCount === "number" ? d.analyzeCount : 0;
    const tipsCount = typeof d.tipsCount === "number" ? d.tipsCount : 0;
    const gymTipsCount =
      typeof d.gymTipsCount === "number" ? d.gymTipsCount : 0;

    if (kind === "analyze") {
      if (analyzeCount >= analyzeLimit) {
        throw new HttpApiError(
          429,
          isPremium
            ? `Límite diario de análisis (${analyzeLimit}) alcanzado (UTC). Vuelve mañana.`
            : `Llegaste al límite gratuito de ${analyzeLimit} análisis por día. Pásate a Eaty Premium para análisis ilimitados.`
        );
      }
      tx.set(
        ref,
        {
          analyzeCount: analyzeCount + 1,
          tipsCount,
          gymTipsCount,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      if (tipsCount >= tipsLimit) {
        throw new HttpApiError(
          429,
          isPremium
            ? `Límite diario de consejos por IA (${tipsLimit}) alcanzado.`
            : `Llegaste al límite gratuito de ${tipsLimit} consejos por día. Eaty Premium lo desbloquea.`
        );
      }
      tx.set(
        ref,
        {
          analyzeCount,
          tipsCount: tipsCount + 1,
          gymTipsCount,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });
}
