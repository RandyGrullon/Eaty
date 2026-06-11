import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Cambia un ID token válido por un custom token del mismo uid. Lo usa la app
 * móvil: el login con Google ocurre en la web (/mobile-auth, porque el SDK
 * nativo de Google no corre en Expo Go) y el custom token vuelve a la app por
 * deep link para signInWithCustomToken. Sin escalada de privilegios: solo se
 * emiten tokens para el uid ya verificado.
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
    return NextResponse.json({ error: "idToken vacío." }, { status: 400 });
  }

  try {
    const auth = getAdminAuth();
    const { uid } = await auth.verifyIdToken(idToken, true);
    const token = await auth.createCustomToken(uid);
    return NextResponse.json({ token });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error("createCustomToken (mobile-token)", message);
    return NextResponse.json(
      { error: "No se pudo completar el inicio de sesión. Intenta de nuevo." },
      { status: 401 }
    );
  }
}
