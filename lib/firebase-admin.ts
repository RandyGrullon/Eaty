import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | undefined;

/**
 * Inicializa Firebase Admin (solo servidor). Requiere una de:
 * - `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON string de la cuenta de servicio
 * - `GOOGLE_APPLICATION_CREDENTIALS`: ruta al archivo JSON (local)
 */
export function getAdminApp(): App {
  if (app) return app;

  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawJson) as Record<string, unknown>;
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido."
      );
    }
    const projectId =
      typeof parsed.project_id === "string" && parsed.project_id
        ? parsed.project_id
        : undefined;
    app = initializeApp({
      credential: cert(parsed as Parameters<typeof cert>[0]),
      ...(projectId && { projectId }),
    });
    return app;
  }

  try {
    app = initializeApp({
      credential: applicationDefault(),
    });
    return app;
  } catch {
    throw new Error(
      "Configura FIREBASE_SERVICE_ACCOUNT_JSON (Vercel) o GOOGLE_APPLICATION_CREDENTIALS (local) para las rutas API."
    );
  }
}

/** `projectId` con el que se verifica en Admin (diagnóstico si el cliente y el servidor chocan). */
export function getAdminAppProjectIdForDiagnostics(): string | null {
  try {
    const a = getAdminApp();
    const id = a?.options?.projectId;
    return typeof id === "string" && id ? id : null;
  } catch {
    return null;
  }
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
