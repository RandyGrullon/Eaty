"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { updateUserProfile, deleteUserAccount } from "@/lib/meals";
import { exportUserData, downloadBlob } from "@/lib/gdpr-export";
import { logger } from "@/lib/logger";
import { PushNotificationManager } from "@/components/pwa/push-notification-manager";
import { PageHeader } from "@/components/app/page-header";
import { UpgradeAccountDialog } from "@/components/profile/upgrade-account-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Languages,
  Ruler,
  Apple,
  ShieldCheck,
  Mail,
  Moon,
  Sun,
  Waves,
  Sunrise,
  LogOut,
  Download,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Check,
  UserPlus,
} from "lucide-react";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { userProfile, refreshUserProfile } = useUserProfile();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [guestLogoutOpen, setGuestLogoutOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Apple Health / Google Fit, biometría y resumen por correo aún no están
  // implementados: se muestran deshabilitados con la etiqueta "Próximamente".

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = async (lang: string) => {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, { language: lang });
      await refreshUserProfile();
      toast({
        title: "Idioma actualizado",
        description: `El idioma de la IA se ha cambiado a ${
          lang === "es" ? "Español" : "Inglés"
        }.`,
      });
    } catch (e) {
      logger.error("Error setting language", e);
    }
  };

  const handleUnitChange = async (type: "weight" | "height", value: string) => {
    if (!user) return;
    try {
      if (type === "weight") {
        await updateUserProfile(user.uid, { weightUnit: value as "kg" | "lbs" });
      } else {
        await updateUserProfile(user.uid, { heightUnit: value as "cm" | "inches" });
      }
      await refreshUserProfile();
      toast({
        title: "Unidades actualizadas",
        description: `Se ha establecido la unidad de ${
          type === "weight" ? "peso" : "altura"
        } en ${value}.`,
      });
    } catch (e) {
      logger.error("Error setting unit", e);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const zipBlob = await exportUserData(user.uid);
      downloadBlob(zipBlob, `eaty-datos-${user.uid.slice(0, 5)}.zip`);
      toast({
        title: "Exportación lista",
        description: "Se ha descargado un archivo ZIP con todos tus datos.",
      });
    } catch (error) {
      logger.error("Error exporting data", error);
      toast({
        title: "Error al exportar",
        description: "No se pudieron generar tus archivos de datos.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      "¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y perderás todo tu historial de comidas y fotos."
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await deleteUserAccount(user);
      await logout().catch(() => undefined);
      toast({
        title: "Cuenta eliminada",
        description: "Todos tus datos han sido borrados de nuestros servidores.",
      });
    } catch (error) {
      logger.error("Error deleting account", error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar todos tus datos. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-full bg-background pb-32 md:pb-12">
        <div className="mx-auto max-w-4xl space-y-4 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  const isGuest = Boolean(user?.isAnonymous);

  const handleLogoutClick = () => {
    if (isGuest) {
      setGuestLogoutOpen(true);
      return;
    }
    void logout();
  };

  return (
    <div className="min-h-full bg-background pb-32 md:pb-12">
      <PageHeader
        title="Configuración"
        subtitle="Preferencias, integraciones y privacidad"
        className="max-w-4xl"
      />

      <div className="mx-auto max-w-4xl space-y-10 px-4 pt-6 sm:px-6 lg:px-10">
        {/* 1. Preferencias de la app */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Preferencias</h2>

          <div className="surface divide-y divide-border p-5 sm:p-6">
            {/* Tema */}
            <div className="pb-6">
              <p className="font-semibold">Tema</p>
              <p className="text-sm text-muted-foreground">Elige el modo y el color de acento.</p>
              <div role="radiogroup" aria-label="Tema" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {THEMES.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "relative rounded-2xl border bg-card p-2 text-left transition-colors",
                        isSelected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <span
                        className="flex h-16 flex-col justify-between rounded-xl border p-2.5"
                        style={{ background: t.preview.bg, borderColor: t.preview.border }}
                        aria-hidden
                      >
                        <span className="flex gap-1">
                          <span className="h-1.5 w-8 rounded-full" style={{ background: t.preview.fg, opacity: 0.8 }} />
                          <span className="h-1.5 w-4 rounded-full" style={{ background: t.preview.fg, opacity: 0.3 }} />
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-4 w-10 rounded-full" style={{ background: t.preview.primary }} />
                          <span className="h-4 w-4 rounded-full" style={{ background: t.preview.card, border: `1px solid ${t.preview.border}` }} />
                        </span>
                      </span>
                      <span className="mt-2 flex items-center gap-1.5 px-1 pb-0.5 text-sm font-medium">
                        <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {t.name}
                      </span>
                      {isSelected && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Idioma de la IA */}
            <div className="flex flex-col justify-between gap-3 py-6 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Languages className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Idioma de la IA</p>
                  <p className="text-sm text-muted-foreground">El idioma con el que te responde el Coach.</p>
                </div>
              </div>
              <Segmented
                label="Idioma de la IA"
                value={userProfile?.language === "en" ? "en" : "es"}
                options={[
                  { value: "es", label: "Español" },
                  { value: "en", label: "English" },
                ]}
                onChange={(v) => void handleLanguageChange(v)}
              />
            </div>

            {/* Unidades */}
            <div className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Ruler className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Unidades de medida</p>
                  <p className="text-sm text-muted-foreground">Cómo ver tu peso y tu altura.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="eyebrow">Peso</span>
                  <Segmented
                    label="Unidad de peso"
                    value={userProfile?.weightUnit === "lbs" ? "lbs" : "kg"}
                    options={[
                      { value: "kg", label: "kg" },
                      { value: "lbs", label: "lbs" },
                    ]}
                    onChange={(v) => void handleUnitChange("weight", v)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="eyebrow">Altura</span>
                  <Segmented
                    label="Unidad de altura"
                    value={userProfile?.heightUnit === "inches" ? "inches" : "cm"}
                    options={[
                      { value: "cm", label: "cm" },
                      { value: "inches", label: "in" },
                    ]}
                    onChange={(v) => void handleUnitChange("height", v)}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Dispositivo e integraciones */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Dispositivo e integraciones</h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <PushNotificationManager />

            <SoonCard
              icon={<Apple className="h-4 w-4" />}
              iconClass="bg-foreground text-background"
              title="Apple Health / Google Fit"
              subtitle="Sincroniza pasos y calorías diarias."
              control={
                <Button variant="outline" size="sm" disabled className="h-9 shrink-0 rounded-full">
                  Conectar
                </Button>
              }
            />

            <SoonCard
              icon={<ShieldCheck className="h-4 w-4" />}
              iconClass="bg-primary/10 text-primary"
              title="Biometría local"
              subtitle="Acceso rápido con Face ID o huella."
              control={<Switch checked={false} disabled aria-label="Biometría local (próximamente)" />}
            />

            <SoonCard
              icon={<Mail className="h-4 w-4" />}
              iconClass="bg-fat/15 text-fat"
              title="Resumen semanal"
              subtitle="Reporte de progreso por correo."
              control={
                <Switch checked={false} disabled aria-label="Resumen semanal por correo (próximamente)" />
              }
            />
          </div>
        </section>

        {/* 3. Privacidad y cuenta */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Privacidad y cuenta</h2>

          <div className="surface divide-y divide-border p-5 sm:p-6">
            {isGuest && (
              <div className="flex flex-col items-start justify-between gap-3 pb-6 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">Estás en modo invitado</p>
                    <p className="max-w-md text-sm text-muted-foreground">
                      Crea una cuenta para no perder tus comidas si cambias de dispositivo.
                    </p>
                  </div>
                </div>
                <Button onClick={() => setUpgradeOpen(true)} className="h-10 w-full shrink-0 gap-2 rounded-full sm:w-auto">
                  <UserPlus className="h-4 w-4" />
                  Crear cuenta
                </Button>
              </div>
            )}

            <div
              className={cn(
                "flex flex-col items-start justify-between gap-3 pb-6 sm:flex-row sm:items-center",
                isGuest && "pt-6"
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Download className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Tus datos en Eaty</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Descarga una copia comprimida de tus comidas, progreso y fotos cuando quieras (GDPR).
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={exporting}
                className="h-10 w-full shrink-0 rounded-full px-4 sm:w-auto"
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando…
                  </>
                ) : (
                  "Exportar datos"
                )}
              </Button>
            </div>

            <div className="flex flex-col items-start justify-between gap-3 py-6 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <LogOut className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">Cerrar sesión</p>
                  <p className="text-sm text-muted-foreground">Cierra tu sesión en este dispositivo.</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleLogoutClick}
                className="h-10 w-full shrink-0 rounded-full px-4 sm:w-auto"
              >
                Cerrar sesión
              </Button>
            </div>

            <div className="pt-6">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <p className="flex items-center gap-2 font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Zona de peligro
                </p>
                <div className="mt-2 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="max-w-md text-sm text-muted-foreground">
                    Eliminar tu cuenta borra para siempre tu historial, metas y fotos. No se puede deshacer.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="h-10 w-full shrink-0 rounded-full px-4 sm:w-auto"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar cuenta"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">Eaty v1.2.0</p>
      </div>

      <AlertDialog open={guestLogoutOpen} onOpenChange={setGuestLogoutOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión de invitado?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás usando Eaty sin cuenta. Si cierras sesión perderás tus comidas, metas y progreso. Crea una cuenta
              para conservarlos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setGuestLogoutOpen(false);
                void logout();
              }}
            >
              Cerrar sesión y perder datos
            </Button>
            <Button
              className="rounded-full"
              onClick={() => {
                setGuestLogoutOpen(false);
                setUpgradeOpen(true);
              }}
            >
              Crear cuenta
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradeAccountDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}

// Vista previa de cada tema con los valores reales de app/globals.css.
const LIGHT_BASE = {
  bg: "oklch(0.985 0.005 110)",
  card: "oklch(1 0 0)",
  fg: "oklch(0.22 0.025 165)",
  border: "oklch(0.915 0.012 140)",
};

const THEMES = [
  { id: "light", name: "Claro", icon: Sun, preview: { ...LIGHT_BASE, primary: "oklch(0.53 0.135 158)" } },
  {
    id: "dark",
    name: "Oscuro",
    icon: Moon,
    preview: {
      bg: "oklch(0.155 0.012 165)",
      card: "oklch(0.2 0.014 165)",
      fg: "oklch(0.96 0.01 140)",
      border: "oklch(0.29 0.016 165)",
      primary: "oklch(0.8 0.16 150)",
    },
  },
  { id: "theme-nature", name: "Océano", icon: Waves, preview: { ...LIGHT_BASE, primary: "oklch(0.52 0.11 200)" } },
  { id: "theme-sunset", name: "Atardecer", icon: Sunrise, preview: { ...LIGHT_BASE, primary: "oklch(0.6 0.17 40)" } },
] as const;

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex w-fit rounded-full bg-muted p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 rounded-full px-4 text-sm font-medium transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SoonCard({
  icon,
  iconClass,
  title,
  subtitle,
  control,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  control: React.ReactNode;
}) {
  return (
    <div className="surface flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", iconClass)}>{icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold">{title}</p>
            <Badge variant="secondary" className="rounded-full font-medium">
              Próximamente
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {control}
    </div>
  );
}
