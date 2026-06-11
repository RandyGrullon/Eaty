import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  // @ts-expect-error: el bundle react-native de firebase/auth la exporta, pero
  // los types web no la declaran (limitación conocida del SDK).
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Mismo proyecto Firebase que la web (Eaty Next.js). Config pública vía
 * variables EXPO_PUBLIC_* (ver .env.example).
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export function getMissingFirebaseConfigKeys(): string[] {
  return Object.entries(firebaseConfig)
    .filter(([, v]) => !v?.trim())
    .map(([k]) => `EXPO_PUBLIC_FIREBASE_${k.replace(/([A-Z])/g, "_$1").toUpperCase()}`);
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function initFirebase(): void {
  if (_app) return;
  const missing = getMissingFirebaseConfigKeys();
  if (missing.length > 0) {
    throw new Error(
      `Falta configuración de Firebase: ${missing.join(", ")}. Revisa mobile/.env (ver .env.example).`
    );
  }
  if (getApps().length > 0) {
    _app = getApps()[0]!;
    _auth = getAuth(_app);
  } else {
    _app = initializeApp(firebaseConfig);
    // En RN la persistencia de sesión no es automática como en web:
    // hay que inyectar AsyncStorage explícitamente.
    _auth = initializeAuth(_app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
  _db = getFirestore(_app);
  _storage = getStorage(_app);
}

/** Acceso perezoso, igual que en la web: no inicializa al importar el módulo. */
export const appFirebase = {
  get auth(): Auth {
    initFirebase();
    return _auth!;
  },
  get db(): Firestore {
    initFirebase();
    return _db!;
  },
  get storage(): FirebaseStorage {
    initFirebase();
    return _storage!;
  },
};
