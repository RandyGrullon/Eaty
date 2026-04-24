"use client";

import { useState } from "react";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { ScanLine, Sparkles, TrendingUp } from "lucide-react";

const highlights = [
  {
    icon: ScanLine,
    title: "Análisis por foto o texto",
    text: "Estima calorías y macros en segundos.",
  },
  {
    icon: Sparkles,
    title: "Consejos personalizados",
    text: "Recomendaciones según lo que registras.",
  },
  {
    icon: TrendingUp,
    title: "Seguimiento claro",
    text: "Metas, historial y progreso en un solo lugar.",
  },
];

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <aside className="relative lg:w-[42%] min-h-[220px] lg:min-h-screen overflow-hidden border-b lg:border-b-0 lg:border-r border-border">
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-chart-2 opacity-[0.97]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_30%_20%,white,transparent_55%),radial-gradient(circle_at_80%_60%,white,transparent_45%)]"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col justify-between px-8 py-10 lg:py-14 lg:px-12 lg:h-full text-primary-foreground">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
                <ScanLine className="h-5 w-5" aria-hidden />
              </div>
              <span className="text-xl font-semibold tracking-tight">Eaty</span>
            </div>
            <p className="mt-4 text-sm sm:text-base text-primary-foreground/85 max-w-sm leading-relaxed">
              Tu asistente nutricional con visión por computador. Registra
              comidas y mantén el control sin complicaciones.
            </p>
          </div>

          <ul className="hidden sm:grid gap-4 mt-10 lg:mt-0">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex gap-3 rounded-xl bg-primary-foreground/10 p-4 ring-1 ring-primary-foreground/10"
              >
                <Icon className="h-5 w-5 shrink-0 mt-0.5 opacity-90" aria-hidden />
                <div>
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-xs text-primary-foreground/75 mt-0.5">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin
                ? "Ingresa para seguir registrando tus comidas."
                : "Únete en un momento y empieza a analizar tu alimentación."}
            </p>
          </div>

          {isLogin ? (
            <LoginForm onToggleMode={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onToggleMode={() => setIsLogin(true)} />
          )}
        </div>
      </main>
    </div>
  );
}
