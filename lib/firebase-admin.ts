import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App | undefined;
/** Rellena al parsear el JSON; sirve de diagnóstico sin leer `options` de App. */
let lastServiceAccountProjectId: string | null = null;

const MISSING_JSON_MSG =
  "Define FIREBASE_SERVICE_ACCOUNT_JSON (texto) o GOOGLE_APPLICATION_CREDENTIALS (ruta al .json) en .env. " +
  "Firebase: Project settings > Service accounts > Generar nueva clave. " +
  "El project_id del JSON debe coincidir con NEXT_PUBLIC_FIREBASE_PROJECT_ID.";

/**
 * Inicializa Firebase Admin (solo servidor). Prioridad:
 * 1. `FIREBASE_SERVICE_ACCOUNT_JSON` (mismo proyecto que el cliente web)
 * 2. `GOOGLE_APPLICATION_CREDENTIALS` (ruta a un .json: se lee con `cert`, no ADC genérico)
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
        "FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido. Comprueba que sea una sola línea o JSON escapado correctamente."
      );
    }
    const projectIdFromJson =
      typeof parsed.project_id === "string" && parsed.project_id
        ? parsed.project_id
        : undefined;
    if (!projectIdFromJson) {
      throw new Error(
        "El JSON de servicio no contiene project_id. Descarga otra vez la clave en Firebase (Service account)."
      );
    }
    lastServiceAccountProjectId = projectIdFromJson;
    app = initializeApp({
      credential: cert(parsed as Parameters<typeof cert>[0]),
      projectId: projectIdFromJson,
    });
    return app;
  }

  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (gac) {
    try {
      const pathToKey = isAbsolute(gac) ? gac : resolve(process.cwd(), gac);
      const parsed = JSON.parse(
        readFileSync(pathToKey, "utf8")
      ) as Record<string, unknown>;
      const projectIdFromFile =
        typeof parsed.project_id === "string" && parsed.project_id
          ? parsed.project_id
          : undefined;
      if (!projectIdFromFile) {
        throw new Error(
          "El archivo de GOOGLE_APPLICATION_CREDENTIALS no contiene project_id."
        );
      }
      lastServiceAccountProjectId = projectIdFromFile;
      app = initializeApp({
        credential: cert(parsed as Parameters<typeof cert>[0]),
        projectId: projectIdFromFile,
      });
      return app;
    } catch (e) {
      if (e instanceof Error && e.message.includes("project_id")) {
        throw e;
      }
      throw new Error(
        `No se pudo leer la clave en GOOGLE_APPLICATION_CREDENTIALS (ruta: ${gac}): ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  }

  throw new Error(MISSING_JSON_MSG);
}

/**
 * Mismo `projectId` con el que se emite/verifica el admin (o null si aún no se inicializó).
 */
export function getAdminAppProjectIdForDiagnostics(): string | null {
  if (lastServiceAccountProjectId) {
    return lastServiceAccountProjectId;
  }
  try {
    const a = getAdminApp();
    const id = a?.options?.projectId;
    return typeof id === "string" && id ? id : null;
  } catch {
    return null;
  }
}

export function isFirebaseServiceAccountJsonConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
