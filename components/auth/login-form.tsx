"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Lock, Mail } from "lucide-react";
import { GoogleIcon } from "./google-icon";

interface LoginFormProps {
  onToggleMode: () => void;
}

export function LoginForm(_props: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const { signIn, signInWithGoogle, resetPassword } = useAuth();

  const handleReset = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Escribe tu correo arriba y vuelve a pulsar «¿La olvidaste?».");
      return;
    }
    try {
      await resetPassword(email.trim());
      setNotice("Te enviamos un correo para restablecer la contraseña.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el correo.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error con Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Correo electrónico</Label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Contraseña</Label>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-primary hover:underline underline-offset-4"
              >
                ¿La olvidaste?
              </button>
            </div>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                aria-hidden
              />
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>

          {notice ? (
            <div role="status" className="rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" className="h-11 w-full rounded-full text-base" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="h-11 w-full gap-2 rounded-full text-base"
        >
          <GoogleIcon className="h-4 w-4 shrink-0" />
          Continuar con Google
        </Button>

    </div>
  );
}
