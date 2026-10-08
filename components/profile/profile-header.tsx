"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ruler, Scale, CalendarDays, Pencil, AlertCircle, Settings, UserPlus } from "lucide-react";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { PageHeader } from "@/components/app/page-header";
import { getProfileDisplayAge } from "@/lib/age-from-birthdate";
import { parseMeasure } from "@/lib/profile-measure";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserProfile } from "@/types/meal";
import { UpgradeAccountDialog } from "./upgrade-account-dialog";

/** Peso en la unidad preferida del usuario ("78 kg" / "172 lb"). */
function compactWeight(kg: number, unit?: "kg" | "lbs"): string {
  if (kg <= 0) return "—";
  return unit === "lbs" ? `${Math.round(kg * 2.20462)} lb` : `${Math.round(kg * 10) / 10} kg`;
}

/** Altura en la unidad preferida ("178 cm" / 5'10"). */
function compactHeight(cm: number, unit?: "cm" | "inches"): string {
  if (cm <= 0) return "—";
  if (unit !== "inches") return `${Math.round(cm)} cm`;
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

interface ProfileHeaderProps {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  onEdit: () => void;
  /** Se mantiene por compatibilidad; el banner de invitado ya no cierra sesión. */
  onLogout: () => void;
  onSettingsClick?: () => void;
}

export function ProfileHeader({ user, userProfile, onEdit, onSettingsClick }: ProfileHeaderProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Usuario";
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
          value: compactWeight(parseMeasure(userProfile.weight) ?? 0, userProfile.weightUnit),
          icon: Scale,
        },
        {
          label: "Altura",
          value: compactHeight(parseMeasure(userProfile.height) ?? 0, userProfile.heightUnit),
          icon: Ruler,
        },
      ]
    : [];

  const level = userProfile?.level;
  const points = userProfile?.points || 0;
  const levelTarget = level ? level * 1000 : 0;
  const levelPct = levelTarget > 0 ? Math.min(100, (points / levelTarget) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Perfil"
        subtitle="Tus datos y tu progreso"
        className="max-w-4xl"
        actions={
          <>
            <ThemeToggle />
            {onSettingsClick && (
              <Button
                variant="outline"
                size="icon"
                onClick={onSettingsClick}
                className="h-10 w-10 rounded-full"
                aria-label="Configuración"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </>
        }
      />

      <div className="mx-auto max-w-4xl space-y-4 px-4 pt-4 sm:px-6 lg:px-10">
        {user?.isAnonymous && (
          <div className="flex flex-col gap-4 rounded-2xl border border-warning/40 bg-warning/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground">
                <AlertCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">Estás en modo invitado</p>
                <p className="text-sm text-muted-foreground">
                  Tus datos se podrían perder si borras el caché o cambias de dispositivo.
                </p>
              </div>
            </div>
            <Button onClick={() => setUpgradeOpen(true)} className="h-10 shrink-0 gap-2 rounded-full">
              <UserPlus className="h-4 w-4" />
              Crear cuenta real
            </Button>
          </div>
        )}

        <section className="surface p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary font-display text-xl font-bold text-primary-foreground sm:h-20 sm:w-20 sm:text-2xl">
                  {initials}
                </div>
                {level ? (
                  <span className="absolute -bottom-1.5 -right-1.5 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-card bg-accent px-1.5 text-xs font-semibold text-accent-foreground tabular">
                    {level}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-semibold sm:text-2xl">{displayName}</h2>
                {user?.email ? (
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                ) : null}
                {level ? (
                  <div className="mt-2 w-full max-w-56 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground tabular">
                      <span>Nivel {level}</span>
                      <span>
                        {points} / {levelTarget} pts
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${levelPct}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <Button variant="outline" onClick={onEdit} className="h-10 shrink-0 gap-2 rounded-full px-4">
              <Pencil className="h-4 w-4" />
              Editar perfil
            </Button>
          </div>

          {infoCards.length > 0 && (
            <dl className="mt-5 grid grid-cols-3 gap-2">
              {infoCards.map((item) => (
                <div key={item.label} className="min-w-0 rounded-xl bg-muted/60 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </dt>
                  <dd className="truncate font-display text-base font-semibold tabular sm:text-lg">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <UpgradeAccountDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </>
  );
}
