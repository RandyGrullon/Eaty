import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { EATY_SERVER_SESSION_COOKIE } from "@/lib/server-auth-session-constants";

export const runtime = "nodejs";

/** 5 días: dentro del rango permitido por Firebase (5 min - 2 semanas). */
const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE_SEC = 5 * 24 * 60 * 60;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Toma un ID token del cliente (REST) y lo convierte en cookie de sesión HttpOnly
 * (createSessionCookie). Así /api/* puede autenticar con verifySessionCookie aunque
 * el header Authorization falle o no vaya en ciertos contextos.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("idToken" in body) ||
    typeof (body as { idToken: unknown }).idToken !== "string"
  ) {
    return NextResponse.json({ error: "Falta idToken." }, { status: 400 });
  }
  const idToken = (body as { idToken: string }).idToken.trim();
  if (!idToken) {
    return NextResponse.json(
      { error: "idToken de sesión vacío." },
      { status: 400 }
    );
  }

  try {
    const auth = getAdminAuth();
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(EATY_SERVER_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SEC,
    });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const code =
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      typeof (e as { code: unknown }).code === "string"
        ? (e as { code: string }).code
        : null;
    logger.error("createSessionCookie", code ? `${code}: ${message}` : message);
    return NextResponse.json(
      { error: "No se pudo crear la sesión. Vuelve a iniciar sesión." },
      { status: 401 }
    );
  }
}

/**
 * Limpia la cookie de sesión (logout del lado del servidor).
 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(EATY_SERVER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
