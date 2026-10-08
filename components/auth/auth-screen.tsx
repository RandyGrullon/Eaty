"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, Salad, Sparkles, LineChart, UserRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EatyLogo } from "@/components/app/eaty-logo";
import { useAuth } from "@/hooks/use-auth";
import { isDemoMode } from "@/lib/demo/mode";
import { cn } from "@/lib/utils";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

const highlights = [
  { icon: Camera, title: "Foto → calorías y macros", text: "La IA identifica el plato y estima la porción." },
  { icon: Salad, title: "Dietas generadas para ti", text: "Planes con recetas paso a paso según tu objetivo." },
  { icon: Sparkles, title: "Coach nutricional", text: "Pregunta qué comer o cómo ajustar tu día." },
  { icon: LineChart, title: "Progreso claro", text: "Metas diarias, racha e historial semanal." },
];

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");
  const { signInAnonymously } = useAuth();
  const demo = isDemoMode();

  const continueAsGuest = async () => {
    setGuestLoading(true);
    setGuestError("");
    try {
      await signInAnonymously();
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : "No se pudo entrar como invitado.");
      setGuestLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background lg:flex-row">
      {/* Panel de marca */}
      <aside className="relative overflow-hidden bg-primary px-6 pb-10 pt-8 text-primary-foreground sm:px-10 lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary-foreground/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent/20" aria-hidden />

        <EatyLogo inverted className="relative" />

        <div className="relative mt-10 lg:mt-0">
          <h1 className="max-w-md text-4xl font-bold leading-[1.05] sm:text-5xl">
            Come mejor sin contar a mano.
          </h1>
          <p className="mt-4 max-w-md text-base text-primary-foreground/85">
            Haz una foto a tu plato y Eaty calcula calorías y macros en segundos, con metas
            ajustadas a tu cuerpo y objetivo.
          </p>
        </div>

        <ul className="relative mt-10 hidden gap-3 sm:grid sm:grid-cols-2 lg:mt-0">
          {highlights.map(({ icon: Icon, title, text }, i) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="rounded-2xl bg-primary-foreground/10 p-4 ring-1 ring-primary-foreground/15"
            >
              <Icon className="h-5 w-5" aria-hidden />
              <p className="mt-3 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs text-primary-foreground/75">{text}</p>
            </motion.li>
          ))}
        </ul>
      </aside>

      {/* Formulario */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div
            role="tablist"
            aria-label="Acceso"
            className="mb-6 grid grid-cols-2 rounded-full bg-muted p-1 text-sm font-medium"
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full py-2 transition-colors",
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-bold">
            {mode === "login" ? "Bienvenido de nuevo" : "Empieza en un minuto"}
          </h2>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Entra para seguir con tu registro de comidas."
              : "Crea tu cuenta y configura tus metas."}
          </p>

          {mode === "login" ? (
            <LoginForm onToggleMode={() => setMode("register")} />
          ) : (
            <RegisterForm onToggleMode={() => setMode("login")} />
          )}

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ¿Solo quieres probar?
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={continueAsGuest}
            disabled={guestLoading}
            className="h-11 w-full gap-2 rounded-full"
          >
            {guestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
            Continuar como invitado
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {demo
              ? "Modo demo: cualquier correo y contraseña sirven; los datos son de ejemplo."
              : "Podrás convertirlo en cuenta real más tarde sin perder tus comidas."}
          </p>
          {guestError ? (
            <p role="alert" className="mt-2 text-center text-sm text-destructive">
              {guestError}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
