"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { updateUserProfile, deleteUserAccountData } from "@/lib/meals";
import { exportUserData, downloadBlob } from "@/lib/gdpr-export";
import { logger } from "@/lib/logger";
import { PushNotificationManager } from "@/components/pwa/push-notification-manager";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Settings,
  Languages,
  Ruler,
  ShieldAlert,
  Apple,
  ShieldCheck,
  ExternalLink,
  Moon,
  Sun,
  Leaf,
  Sunrise,
  LogOut,
  Download,
  AlertTriangle,
  Loader2,
  Check,
} from "lucide-react";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { userProfile, refreshUserProfile } = useUserProfile();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Simulated integrations state
  const [healthConnected, setHealthConnected] = useState(false);
  const [biometryEnabled, setBiometryEnabled] = useState(false);
  const [emailReportSubscribed, setEmailReportSubscribed] = useState(true);

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
      await deleteUserAccountData(user.uid);
      await logout();
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
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const themesList = [
    { id: "light", name: "Claro", icon: Sun, class: "bg-white border-slate-200 text-slate-900", iconColor: "text-amber-500" },
    { id: "dark", name: "Oscuro", icon: Moon, class: "bg-slate-950 border-slate-800 text-slate-50", iconColor: "text-primary" },
    { id: "theme-nature", name: "Naturaleza", icon: Leaf, class: "bg-emerald-950 border-emerald-900 text-emerald-50", iconColor: "text-emerald-400" },
    { id: "theme-sunset", name: "Atardecer", icon: Sunrise, class: "bg-orange-950 border-orange-900 text-orange-50", iconColor: "text-orange-400" },
  ];

  return (
    <div className="min-h-screen bg-background pb-32 pt-6 px-4 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-10">
        
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">
                Configuración
              </h1>
              <p className="text-sm font-medium text-muted-foreground">
                Gestiona tus preferencias de aplicación, integraciones y privacidad de datos.
              </p>
            </div>
          </div>
        </div>

        {/* 1. Preferencias de la Aplicación */}
        <section className="space-y-6">
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Preferencias de la App
          </h2>

          <div className="rounded-[2rem] border border-border/40 bg-card/30 p-6 sm:p-8 space-y-8 backdrop-blur-xl">
            
            {/* Visual Theme Selection */}
            <div className="space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Tema Visual
              </Label>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {themesList.map((t) => {
                  const Icon = t.icon;
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 text-center cursor-pointer ${t.class} ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 scale-[1.02] border-primary"
                          : "border-border/40 opacity-70 hover:opacity-100 hover:scale-[1.01]"
                      }`}
                    >
                      <div className={`p-2 rounded-xl bg-muted/20 ${t.iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold">{t.name}</span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-0.5 rounded-full">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Language Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-black text-foreground">Idioma de la IA</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Establece el idioma con el que te responderá el Coach Nutricional.
                </p>
              </div>
              <div className="flex rounded-xl bg-muted p-1 w-fit border border-border/40">
                <button
                  onClick={() => handleLanguageChange("es")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    userProfile?.language !== "en"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Español
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    userProfile?.language === "en"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Units Selection */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-border/40">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-black text-foreground">Unidades de Medida</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Elige el formato de visualización para peso y altura.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                {/* Weight unit */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Peso</span>
                  <div className="flex rounded-xl bg-muted p-1 border border-border/40">
                    <button
                      onClick={() => handleUnitChange("weight", "kg")}
                      className={`rounded-lg px-3 py-1 text-xs font-black transition-all cursor-pointer ${
                        userProfile?.weightUnit !== "lbs"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      kg
                    </button>
                    <button
                      onClick={() => handleUnitChange("weight", "lbs")}
                      className={`rounded-lg px-3 py-1 text-xs font-black transition-all cursor-pointer ${
                        userProfile?.weightUnit === "lbs"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      lbs
                    </button>
                  </div>
                </div>

                {/* Height unit */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Altura</span>
                  <div className="flex rounded-xl bg-muted p-1 border border-border/40">
                    <button
                      onClick={() => handleUnitChange("height", "cm")}
                      className={`rounded-lg px-3 py-1 text-xs font-black transition-all cursor-pointer ${
                        userProfile?.heightUnit !== "inches"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      cm
                    </button>
                    <button
                      onClick={() => handleUnitChange("height", "inches")}
                      className={`rounded-lg px-3 py-1 text-xs font-black transition-all cursor-pointer ${
                        userProfile?.heightUnit === "inches"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      in
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 2. Dispositivo e Integraciones */}
        <section className="space-y-6">
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Dispositivo e Integraciones
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Real Push Notifications Manager */}
            <PushNotificationManager />

            {/* Apple Health integration card */}
            <div className="flex items-center justify-between rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-xl shadow-black/[0.02] backdrop-blur-sm transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white shadow-lg">
                  <Apple className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Apple Health / Google Fit</p>
                  <p className="text-[10px] text-muted-foreground">Sincroniza pasos y calorías diarias.</p>
                </div>
              </div>
              <Button
                variant={healthConnected ? "outline" : "default"}
                size="sm"
                onClick={() => {
                  setHealthConnected(!healthConnected);
                  toast({
                    title: healthConnected ? "Desconectado" : "Conectado",
                    description: healthConnected
                      ? "Conexión con Apple Health finalizada."
                      : "Conexión establecida y simulada correctamente.",
                  });
                }}
                className="rounded-xl font-bold border-primary/20"
              >
                {healthConnected ? "Conectado" : "Conectar"}
              </Button>
            </div>

            {/* Biometrics */}
            <div className="flex items-center justify-between rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-xl shadow-black/[0.02] backdrop-blur-sm transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-lg">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Biometría local</p>
                  <p className="text-[10px] text-muted-foreground">Acceso rápido con FaceID o Huella.</p>
                </div>
              </div>
              <Switch
                checked={biometryEnabled}
                onCheckedChange={(val) => {
                  setBiometryEnabled(val);
                  toast({
                    title: "Biometría",
                    description: val ? "Autenticación biométrica habilitada." : "Autenticación biométrica deshabilitada.",
                  });
                }}
              />
            </div>

            {/* Weekly Email Report */}
            <div className="flex items-center justify-between rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-xl shadow-black/[0.02] backdrop-blur-sm transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-chart-2/10 text-chart-2 shadow-lg">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Resumen Semanal</p>
                  <p className="text-[10px] text-muted-foreground">Reporte de progreso detallado por correo.</p>
                </div>
              </div>
              <Switch
                checked={emailReportSubscribed}
                onCheckedChange={(val) => {
                  setEmailReportSubscribed(val);
                  toast({
                    title: "Reportes por correo",
                    description: val ? "Te has suscrito al reporte semanal." : "Te has dado de baja de los reportes por correo.",
                  });
                }}
              />
            </div>
          </div>
        </section>

        {/* 3. Privacidad y Cuenta */}
        <section className="space-y-6">
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            Privacidad y Cuenta
          </h2>

          <div className="rounded-[2rem] border border-border/40 bg-card/30 p-6 sm:p-8 space-y-6 backdrop-blur-xl">
            
            {/* Actions grid */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <p className="text-sm font-black text-foreground">Tus datos en Eaty</p>
                <p className="text-[11px] text-muted-foreground max-w-md">
                  Garantizamos tus derechos GDPR. Puedes exportar una copia comprimida de tus comidas, progreso y fotos en cualquier momento.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={exporting}
                className="rounded-2xl font-black h-12 px-6 border-border/40 hover:bg-card shrink-0 w-full sm:w-auto"
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Datos (GDPR)
                  </>
                )}
              </Button>
            </div>

            {/* Logout button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pt-6 border-t border-border/40">
              <div>
                <p className="text-sm font-black text-foreground">Cerrar Sesión</p>
                <p className="text-[11px] text-muted-foreground">
                  Cierra tu sesión en este dispositivo de forma segura.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="rounded-2xl font-black h-12 px-6 border-amber-500/20 text-amber-500 hover:bg-amber-500/5 shrink-0 w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 space-y-4 pt-6 mt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Zona de Peligro
                </h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <p className="text-xs text-muted-foreground max-w-md">
                  Eliminar tu cuenta borrará permanentemente todo tu historial, metas y fotos. Esta acción no se puede deshacer.
                </p>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="rounded-2xl font-black h-12 px-6 shadow-xl shadow-destructive/10 shrink-0 w-full sm:w-auto"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Eliminar Cuenta Definitivamente"
                  )}
                </Button>
              </div>
            </div>

          </div>
        </section>

        {/* Footer info */}
        <div className="text-center pt-4 text-[10px] text-muted-foreground/50 font-medium tracking-widest">
          EATY APP v1.2.0 · TODOS LOS DERECHOS RESERVADOS
        </div>

      </div>
    </div>
  );
}
