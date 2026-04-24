export const FIREBASE_CLIENT_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

/**
 * Lee cada clave con `process.env.NEXT_PUBLIC_…` fijo (obligatorio en el cliente: Next
 * no sustituye `process.env[variableDinamica]`, por eso antes parecía que .env "no se leía").
 */
function readAllPublicFirebaseFromEnv() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

/** Claves faltantes (sin lanzar). */
export function getMissingFirebaseConfigKeys(): string[] {
  const e = readAllPublicFirebaseFromEnv();
  const missing: string[] = [];
  if (!e.apiKey?.trim()) {
    missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  }
  if (!e.authDomain?.trim()) {
    missing.push("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  }
  if (!e.projectId?.trim()) {
    missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }
  if (!e.storageBucket?.trim()) {
    missing.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  }
  if (!e.messagingSenderId?.trim()) {
    missing.push("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  }
  if (!e.appId?.trim()) {
    missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  }
  return missing;
}

export function isFirebaseConfigReady(): boolean {
  return getMissingFirebaseConfigKeys().length === 0;
}

/**
 * Configuración del SDK web. Define todas las claves en `.env` o `.env.local` (ver `.env.example`).
 */
export function getFirebaseClientConfig(): FirebaseClientConfig {
  const missing = getMissingFirebaseConfigKeys();
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno de Firebase: ${missing.join(", ")}. ` +
        "Copia .env.example a .env.local y pega el bloque de tu proyecto (Firebase Console > General > Your apps > Web app)."
    );
  }
  const e = readAllPublicFirebaseFromEnv();
  return {
    apiKey: e.apiKey!.trim(),
    authDomain: e.authDomain!.trim(),
    projectId: e.projectId!.trim(),
    storageBucket: e.storageBucket!.trim(),
    messagingSenderId: e.messagingSenderId!.trim(),
    appId: e.appId!.trim(),
  };
}
