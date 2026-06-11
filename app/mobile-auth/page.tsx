"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { appFirebase, googleProvider } from "@/lib/firebase";

/**
 * Login con Google para la app móvil. La app abre esta página en un navegador
 * de autenticación (expo-web-browser), aquí ocurre el OAuth con el proveedor
 * web ya configurado, y devolvemos un custom token al deep link de la app
 * (?redirect=exp://... en Expo Go, eaty://... en builds).
 */

// Solo deep links de la app: evita usar esta página como open redirect.
const ALLOWED_REDIRECT = /^(exp|eaty):\/\//;

function authErrorCode(e: unknown): string {
  return typeof e === "object" && e !== null && "code" in e
    ? String((e as { code: unknown }).code)
    : "";
}

export default function MobileAuthPage() {
  const [redirect, setRedirect] = useState<string | null>(null);
  const [current, setCurrent] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("redirect");
    setRedirect(r && ALLOWED_REDIRECT.test(r) ? r : null);
    const auth = appFirebase.auth;
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrent(u);
      setReady(true);
    });
    // Fallback signInWithRedirect: el usuario llega vía onAuthStateChanged.
    getRedirectResult(auth).catch((e) => {
      setError(humanError(e));
    });
    return unsub;
  }, []);

  const finish = useCallback(
    async (user: User) => {
      if (!redirect) return;
      setBusy(true);
      setError(null);
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/auth/mobile-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const data: unknown = await res.json().catch(() => ({}));
        const token =
          typeof data === "object" && data !== null && "token" in data
            ? String((data as { token: unknown }).token)
            : null;
        if (!res.ok || !token) {
          const msg =
            typeof data === "object" && data !== null && "error" in data
              ? String((data as { error: unknown }).error)
              : "No se pudo completar el inicio de sesión.";
          throw new Error(msg);
        }
        const sep = redirect.includes("?") ? "&" : "?";
        window.location.replace(
          `${redirect}${sep}token=${encodeURIComponent(token)}`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado.");
        setBusy(false);
      }
    },
    [redirect]
  );

  const loginGoogle = useCallback(async () => {
    setBusy(true);
    setError(null);
    const auth = appFirebase.auth;
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await finish(cred.user);
    } catch (e) {
      const code = authErrorCode(e);
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setBusy(false);
        return;
      }
      // Navegadores embebidos sin soporte de popups: caemos a redirect.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (e2) {
          setError(humanError(e2));
          setBusy(false);
          return;
        }
      }
      setError(humanError(e));
      setBusy(false);
    }
  }, [finish]);

  const switchAccount = useCallback(async () => {
    setError(null);
    await signOut(appFirebase.auth);
    await loginGoogle();
  }, [loginGoogle]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="text-4xl">🥗</div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Eaty</h1>

        {!redirect ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Abre esta página desde la app de Eaty para iniciar sesión.
          </p>
        ) : !ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Inicia sesión para continuar en la app
            </p>

            {current ? (
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => finish(current)}
                  disabled={busy}
                  className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {busy
                    ? "Conectando…"
                    : `Continuar como ${current.displayName ?? current.email ?? "tu cuenta"}`}
                </button>
                <button
                  onClick={switchAccount}
                  disabled={busy}
                  className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground disabled:opacity-50"
                >
                  Usar otra cuenta de Google
                </button>
              </div>
            ) : (
              <button
                onClick={loginGoogle}
                disabled={busy}
                className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Conectando…" : "Continuar con Google"}
              </button>
            )}

            {error ? (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function humanError(e: unknown): string {
  const code = authErrorCode(e);
  const map: Record<string, string> = {
    "auth/unauthorized-domain":
      "Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains).",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
  };
  return (
    map[code] ??
    (e instanceof Error && e.message ? e.message : "No se pudo iniciar sesión con Google.")
  );
}
