import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminAppProjectIdForDiagnostics,
  getAdminAuth,
  getAdminFirestore,
} from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
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
    const hint = [
      " (modo dev)",
      `API Firebase (cuenta de servicio): projectId ≈ ${adminP ?? "?"}.`,
      fromEnv
        ? `Cliente: NEXT_PUBLIC_FIREBASE_PROJECT_ID=${fromEnv}. Deben ser el MISMO proyecto.`
        : `No está NEXT_PUBLIC_FIREBASE_* en .env: el cliente web usa el fallback de lib/firebase.ts; el Admin debe ser la cuenta de servicio de ESE mismo proyecto (consola > Project settings > Service account).`,
      "Sin eso, verifyIdToken/verifySessionCookie fallan aunque tengas sesión en el navegador.",
    ].join(" ");
    throw new HttpApiError(401, `${base} ${hint}`);
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

function dailyAnalyzeLimit(): number {
  const n = parseInt(process.env.DAILY_ANALYZE_LIMIT ?? "60", 10);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

function dailyTipsLimit(): number {
  const n = parseInt(process.env.DAILY_TIPS_LIMIT ?? "40", 10);
  return Number.isFinite(n) && n > 0 ? n : 40;
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
  const analyzeLimit = dailyAnalyzeLimit();
  const tipsLimit = dailyTipsLimit();

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const analyzeCount =
      typeof snap.data()?.analyzeCount === "number"
        ? snap.data()!.analyzeCount
        : 0;
    const tipsCount =
      typeof snap.data()?.tipsCount === "number"
        ? snap.data()!.tipsCount
        : 0;

    if (kind === "analyze") {
      if (analyzeCount >= analyzeLimit) {
        throw new HttpApiError(
          429,
          `Límite diario de análisis (${analyzeLimit}) alcanzado. Vuelve mañana.`
        );
      }
      tx.set(
        ref,
        {
          analyzeCount: analyzeCount + 1,
          tipsCount,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      if (tipsCount >= tipsLimit) {
        throw new HttpApiError(
          429,
          `Límite diario de consejos por IA (${tipsLimit}) alcanzado.`
        );
      }
      tx.set(
        ref,
        {
          analyzeCount,
          tipsCount: tipsCount + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  });
}
