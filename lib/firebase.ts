import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  getFirebaseClientConfig,
  isFirebaseConfigReady,
  getMissingFirebaseConfigKeys,
} from "@/lib/firebase-config";

const googleProvider = new GoogleAuthProvider();

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function initClientFirebase(): void {
  if (_app) {
    return;
  }
  if (!isFirebaseConfigReady()) {
    throw new Error(
      "Falta configuración de Firebase: " +
        getMissingFirebaseConfigKeys().join(", ") +
        ". Revisa .env o .env.local y .env.example."
    );
  }
  _app = getApps().length > 0 ? getApps()[0]! : initializeApp(getFirebaseClientConfig());
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  _storage = getStorage(_app);
}

/**
 * Acceso perezoso al SDK: no inicializa Firebase al importar el módulo (evita pantalla en blanco si falla el env).
 */
export const appFirebase = {
  get auth(): Auth {
    initClientFirebase();
    return _auth!;
  },
  get db(): Firestore {
    initClientFirebase();
    return _db!;
  },
  get storage(): FirebaseStorage {
    initClientFirebase();
    return _storage!;
  },
};

export { googleProvider };
