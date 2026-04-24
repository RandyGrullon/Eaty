const KEYS = [
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
 * Configuración del SDK web. Define todas las claves en `.env` o `.env.local` (ver `.env.example`).
 */
export function getFirebaseClientConfig(): FirebaseClientConfig {
  const missing: string[] = [];
  for (const k of KEYS) {
    const v = process.env[k]?.trim();
    if (!v) missing.push(k);
  }
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno de Firebase: ${missing.join(", ")}. ` +
        "Copia .env.example a .env.local y pega el bloque de tu proyecto (Firebase Console > General > Your apps > Web app)."
    );
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!.trim(),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!.trim(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!.trim(),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!.trim(),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!.trim(),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!.trim(),
  };
}
