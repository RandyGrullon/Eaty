import { NextResponse } from "next/server";
import {
  HttpApiError,
  requireUidFromRequest,
} from "@/lib/api-auth-usage";
import {
  getAdminAuth,
  getAdminFirestore,
  getAdminStorageBucket,
  isFirebaseServiceAccountJsonConfigured,
} from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Elimina la cuenta del usuario autenticado:
 * 1. Firestore: `users/{uid}` y todas sus subcolecciones (incl. usage/billing).
 * 2. Storage: todo bajo `users/{uid}/`.
 * 3. Firebase Auth: el usuario.
 * Responde 503 si Firebase Admin no está configurado (el cliente usa su fallback).
 */
export async function POST(req: Request) {
  if (!isFirebaseServiceAccountJsonConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin no está configurado en el servidor." },
      { status: 503 }
    );
  }

  let uid: string;
  try {
    uid = await requireUidFromRequest(req);
  } catch (e) {
    if (e instanceof HttpApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    logger.error("account-delete auth", e);
    return NextResponse.json(
      { error: "No se pudo verificar la sesión." },
      { status: 503 }
    );
  }

  try {
    const db = getAdminFirestore();
    await db.recursiveDelete(db.doc(`users/${uid}`));
  } catch (e) {
    logger.error("account-delete firestore", e);
    return NextResponse.json(
      { error: "No se pudieron eliminar tus datos. Inténtalo de nuevo." },
      { status: 500 }
    );
  }

  // Fotos: si falla no bloquea el borrado de la cuenta (se registra el error).
  try {
    await getAdminStorageBucket().deleteFiles({
      prefix: `users/${uid}/`,
      force: true,
    });
  } catch (e) {
    logger.error("account-delete storage", e);
  }

  try {
    await getAdminAuth().deleteUser(uid);
  } catch (e) {
    const code =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (code !== "auth/user-not-found") {
      logger.error("account-delete auth user", e);
      return NextResponse.json(
        {
          error:
            "Tus datos se eliminaron, pero no se pudo borrar el usuario. Inténtalo de nuevo.",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
