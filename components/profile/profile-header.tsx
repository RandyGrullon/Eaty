"use client";

import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Target,
  CalendarDays,
  Edit,
  AlertCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { getProfileDisplayAge } from "@/lib/age-from-birthdate";
import {
  formatHeightDisplay,
  formatWeightDisplay,
} from "@/lib/unit-conversion";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserProfile } from "@/types/meal";

interface ProfileHeaderProps {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  onEdit: () => void;
  onLogout: () => void;
}

export function ProfileHeader({
  user,
  userProfile,
  onEdit,
  onLogout,
}: ProfileHeaderProps) {
  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Usuario";
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const infoCards = userProfile
    ? [
        { label: "Edad", value: `${getProfileDisplayAge(userProfile) ?? "—"} años`, icon: CalendarDays },
        {
          label: "Peso",
          value: typeof userProfile.weight === "string" ? "Cifrado 🔒" : formatWeightDisplay(userProfile.weight || 0),
          icon: Target,
        },
        {
          label: "Altura",
          value: typeof userProfile.height === "string" ? "Cifrado 🔒" : formatHeightDisplay(userProfile.height || 0),
          icon: TrendingUp,
        },
      ]
    : [];

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-background to-chart-2/[0.06]" aria-hidden />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" aria-hidden />

      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-12 pt-12 sm:px-8">
        {user?.isAnonymous && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[2rem] border border-warning/20 bg-warning/5 p-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-foreground">Estás en modo invitado</p>
                <p className="text-sm font-medium text-muted-foreground leading-snug">
                  Tus datos se podrían perder si borras el caché o cambias de dispositivo.
                </p>
              </div>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="rounded-xl font-bold border-warning/50 text-warning-foreground hover:bg-warning/10"
            >
              Crear cuenta real
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-primary text-2xl font-black text-primary-foreground shadow-2xl shadow-primary/20 transition-transform hover:scale-105">
                {initials}
              </div>
              {userProfile?.level && (
                <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-chart-2 font-black text-white shadow-lg">
                  {userProfile.level}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">
                Mi Cuenta {userProfile?.points ? `· ${userProfile.points} pts` : ""}
              </p>
              <h1 className="truncate text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {displayName}
              </h1>
              {userProfile?.level && (
                <div className="mt-2 w-48 space-y-1">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                    <span>Nivel {userProfile.level}</span>
                    <span>{userProfile.points || 0} / {userProfile.level * 1000}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-chart-2 transition-all duration-500"
                      style={{ width: `${Math.min(100, ((userProfile.points || 0) / (userProfile.level * 1000)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <ThemeToggle />
            <Button
              variant="outline"
              onClick={onEdit}
              className="h-12 gap-2 rounded-2xl border-border/40 bg-card/40 px-6 font-bold shadow-sm backdrop-blur-md transition-all hover:bg-card"
            >
              <Edit className="h-4 w-4" />
              Editar Perfil
            </Button>
          </div>
        </div>

        {infoCards.length > 0 && (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {infoCards.map((item) => (
              <div key={item.label} className="flex items-center gap-4 rounded-[1.5rem] border border-border/40 bg-card/40 p-4 backdrop-blur-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    {item.label}
                  </p>
                  <p className="text-sm font-black text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
