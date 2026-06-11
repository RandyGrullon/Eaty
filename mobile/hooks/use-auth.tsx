import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { appFirebase } from "@/lib/firebase";

type AuthContextValue = {
  user: User | null;
  /** true mientras Firebase restaura la sesión persistida al arrancar. */
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  /** Resuelve false si el usuario cerró el navegador sin completar el login. */
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Mensajes en español para los códigos de error comunes de Firebase Auth. */
function friendlyAuthError(e: unknown): Error {
  const code =
    typeof e === "object" && e !== null && "code" in e
      ? String((e as { code: unknown }).code)
      : "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/invalid-email": "El correo no es válido.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese correo.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
  };
  return new Error(map[code] ?? (e instanceof Error ? e.message : "Error de autenticación."));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(appFirebase.auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(appFirebase.auth, email.trim(), password);
    } catch (e) {
      throw friendlyAuthError(e);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      try {
        const cred = await createUserWithEmailAndPassword(
          appFirebase.auth,
          email.trim(),
          password
        );
        if (displayName?.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
      } catch (e) {
        throw friendlyAuthError(e);
      }
    },
    []
  );

  /**
   * Google no tiene SDK nativo utilizable en Expo Go, así que el OAuth ocurre
   * en la web de Eaty (/mobile-auth): se abre en un navegador de autenticación,
   * la web devuelve un custom token por deep link y aquí se canjea la sesión.
   */
  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
    if (!base) {
      throw new Error(
        "Falta EXPO_PUBLIC_API_BASE_URL en mobile/.env (URL de la web Eaty)."
      );
    }
    const redirectUri = Linking.createURL("google-auth");
    const result = await WebBrowser.openAuthSessionAsync(
      `${base}/mobile-auth?redirect=${encodeURIComponent(redirectUri)}`,
      redirectUri
    );
    if (result.type !== "success") return false; // el usuario canceló
    const { queryParams } = Linking.parse(result.url);
    const token =
      typeof queryParams?.token === "string" ? queryParams.token : null;
    if (!token) {
      throw new Error("No se recibió la sesión de Google. Intenta de nuevo.");
    }
    try {
      await signInWithCustomToken(appFirebase.auth, token);
      return true;
    } catch (e) {
      throw friendlyAuthError(e);
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(appFirebase.auth);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, signIn, signUp, signInWithGoogle, signOut }),
    [user, initializing, signIn, signUp, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
