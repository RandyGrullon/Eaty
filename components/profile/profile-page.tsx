"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Calendar as CalendarIcon,
  TrendingUp,
  Target,
  Award,
  CalendarDays,
  Edit,
  Flame,
  Loader2,
  Dumbbell,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Download,
  Apple,
  LogOut,
  Settings2,
  Trash2,
  ShieldCheck,
  Share2,
  Bell,
} from "lucide-react";
import { encryptData, decryptData } from "@/lib/encryption";
import { PushNotificationManager } from "@/components/pwa/push-notification-manager";
import { format } from "date-fns";
import { es as esLocale } from "date-fns/locale";
import { isAfter, isBefore, startOfDay, subYears } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  calculateAgeFromBirthDateString,
  formatDateOnlyLocal,
  getProfileDisplayAge,
  parseISODateLocal,
} from "@/lib/age-from-birthdate";
import { useToast } from "@/hooks/use-toast";
import { MealCalendar } from "./meal-calendar";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { getUserMeals, updateUserProfile, deleteUserAccountData } from "@/lib/meals";
import { exportUserData, downloadBlob } from "@/lib/gdpr-export";
import { logger } from "@/lib/logger";
import type { Meal } from "@/types/meal";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { getBodyMatterPublicOrigin } from "@/lib/env-public";

/** Radix Dialog trata el Select (portal) como “fuera”; sin esto no recibe clic/foco. */
function isRadixPortalLayerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('[data-slot="select-content"]'));
}

interface ProfileStats {
  totalMeals: number;
  totalCalories: number;
  averageCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalSugar: number;
  weeklyMeals: number;
  weeklyCalories: number;
}

type TimePeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi-annual"
  | "annual";

const ACHIEVEMENTS_MAP = {
  first_meal: { label: "Primera Comida", desc: "¡Has comenzado tu viaje!", icon: Sparkles, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  explorer: { label: "Explorador", desc: "10 comidas registradas", icon: CalendarIcon, color: "text-blue-500", bg: "bg-blue-500/10" },
  nutrition_master: { label: "Maestro Nutricional", desc: "50 comidas registradas", icon: Award, color: "text-purple-500", bg: "bg-purple-500/10" },
  streak_3: { label: "Racha de 3", desc: "3 días seguidos", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
  streak_7: { label: "Racha de 7", desc: "¡Una semana impecable!", icon: Target, color: "text-red-500", bg: "bg-red-500/10" },
  hydrated_hero: { icon: Award, label: "Héroe Hidratado", desc: "8+ vasos de agua en un día", color: "text-cyan-500", bg: "bg-cyan-500/10" },
};

export function ProfilePage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveProfilePending, setSaveProfilePending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("weekly");
  const [editData, setEditData] = useState<{
    birthDate: Date | undefined;
    gender: "male" | "female" | "other";
    weight: string;
    weightUnit: "kg" | "lbs";
    height: string;
    heightUnit: "cm" | "inches";
    activityLevel:
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "very_active";
    language: string;
  }>({
    birthDate: undefined,
    gender: "male" as "male" | "female" | "other",
    weight: "",
    weightUnit: "kg" as "kg" | "lbs",
    height: "",
    heightUnit: "cm" as "cm" | "inches",
    activityLevel: "moderate" as
      | "sedentary"
      | "light"
      | "moderate"
      | "active"
      | "very_active",
    language: "es",
  });
  const { user, logout } = useAuth();
  const { userProfile, refreshUserProfile } = useUserProfile();
  const { toast } = useToast();

  useEffect(() => {
    const loadAndDecrypt = async () => {
      if (userProfile && user) {
        const decryptedWeight = typeof userProfile.weight === 'string' 
          ? await decryptData(userProfile.weight, user.uid)
          : userProfile.weight;
        
        const decryptedHeight = typeof userProfile.height === 'string' 
          ? await decryptData(userProfile.height, user.uid)
          : userProfile.height;

        const birthDate = userProfile.birthDate
          ? new Date(userProfile.birthDate)
          : undefined;

        const weightUnit = userProfile.weightUnit || "kg";
        const heightUnit = userProfile.heightUnit || "cm";

        const weightDisplay = decryptedWeight 
          ? weightUnit === "lbs" 
            ? Math.round(Number(decryptedWeight) * 2.20462) 
            : Number(decryptedWeight)
          : "";

        const heightDisplay = decryptedHeight
          ? heightUnit === "inches"
            ? Math.round(Number(decryptedHeight) / 2.54)
            : Number(decryptedHeight)
          : "";

        setEditData({
          birthDate,
          gender: userProfile.gender || "male",
          weight: weightDisplay.toString(),
          weightUnit,
          height: heightDisplay.toString(),
          heightUnit,
          activityLevel: userProfile.activityLevel || "moderate",
          language: userProfile.language || "es",
        });
      }
    };
    loadAndDecrypt();
  }, [userProfile, user]);

  useEffect(() => {
    if (user) {
      loadMealsAndStats();
    }
  }, [user]);

  const loadMealsAndStats = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const userMeals = await getUserMeals(user.uid);

      setMeals(userMeals);
      calculateStats(userMeals, selectedPeriod);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (meals: Meal[], period: TimePeriod = "weekly") => {
    const filteredMeals = filterMealsByPeriod(meals, period);
    if (filteredMeals.length === 0) {
      setStats({
        totalMeals: 0,
        totalCalories: 0,
        averageCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
        totalSugar: 0,
        weeklyMeals: 0,
        weeklyCalories: 0,
      });
      return;
    }

    const totalMeals = filteredMeals.length;
    const totalCalories = filteredMeals.reduce(
      (sum, meal) => sum + meal.calories,
      0
    );
    const averageCalories = Math.round(totalCalories / totalMeals);

    const totalProtein = filteredMeals.reduce(
      (sum, meal) => sum + meal.macros.protein,
      0
    );
    const totalCarbs = filteredMeals.reduce(
      (sum, meal) => sum + meal.macros.carbs,
      0
    );
    const totalFat = filteredMeals.reduce(
      (sum, meal) => sum + meal.macros.fat,
      0
    );
    const totalFiber = filteredMeals.reduce(
      (sum, meal) => sum + meal.macros.fiber,
      0
    );
    const totalSugar = filteredMeals.reduce(
      (sum, meal) => sum + meal.macros.sugar,
      0
    );

    // For period stats, use the filtered meals count and calories
    const periodMeals = filteredMeals.length;
    const periodCalories = totalCalories;

    setStats({
      totalMeals,
      totalCalories,
      averageCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
      totalSugar,
      weeklyMeals: periodMeals,
      weeklyCalories: periodCalories,
    });
  };

  // Time period filtering functions
  const filterMealsByPeriod = (meals: Meal[], period: TimePeriod): Meal[] => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "daily":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "monthly":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarterly":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "semi-annual":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "annual":
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return meals;
    }

    return meals.filter((meal) => meal.createdAt >= startDate);
  };

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    calculateStats(meals, period);
  };

  const getPeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case "daily":
        return "Hoy";
      case "weekly":
        return "Esta semana";
      case "monthly":
        return "Este mes";
      case "quarterly":
        return "Este trimestre";
      case "semi-annual":
        return "Este semestre";
      case "annual":
        return "Este año";
      default:
        return "Periodo";
    }
  };

  // Unit conversion functions
  const convertWeight = (
    value: number,
    fromUnit: string,
    toUnit: string
  ): number => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === "kg" && toUnit === "lbs")
      return Math.round(value * 2.20462 * 10) / 10;
    if (fromUnit === "lbs" && toUnit === "kg")
      return Math.round((value / 2.20462) * 10) / 10;
    return value;
  };

  const convertHeight = (
    value: number,
    fromUnit: string,
    toUnit: string
  ): number => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === "cm" && toUnit === "inches")
      return Math.round((value / 2.54) * 10) / 10;
    if (fromUnit === "inches" && toUnit === "cm")
      return Math.round(value * 2.54 * 10) / 10;
    return value;
  };

  const formatHeightImperial = (inches: number): string => {
    const feet = Math.floor(inches / 12);
    const remainingInches = Math.round(inches % 12);
    return `${feet}'${remainingInches}"`;
  };

  const formatHeightDisplay = (heightCm: number): string => {
    if (heightCm <= 0) return "No especificada";

    const inches = Math.round(heightCm / 2.54);
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;

    return `${feet}'${remainingInches}" (${heightCm}cm)`;
  };

  const formatWeightDisplay = (weightKg: number): string => {
    if (weightKg <= 0) return "No especificado";

    const lbs = Math.round(weightKg * 2.20462);
    return `${weightKg}kg (${lbs}lbs)`;
  };

  const openEditModal = () => {
    if (userProfile) {
      const weightValue = typeof userProfile.weight === 'string' ? 0 : (userProfile.weight || 0);
      const heightValue = typeof userProfile.height === 'string' ? 0 : (userProfile.height || 0);

      const weightUnit: "kg" | "lbs" = userProfile.weightUnit ?? "kg";
      const heightUnit: "cm" | "inches" = userProfile.heightUnit ?? "cm";

      const weightDisplay =
        weightUnit === "lbs"
          ? Math.round(weightValue * 2.20462 * 10) / 10
          : weightValue;
      const heightDisplay =
        heightUnit === "inches"
          ? Math.round((heightValue / 2.54) * 10) / 10
          : heightValue;

      let birthDate: Date | undefined;
      if (userProfile.birthDate) {
        birthDate = parseISODateLocal(userProfile.birthDate) ?? undefined;
      } else if (
        userProfile.age != null &&
        userProfile.age > 0 &&
        userProfile.age <= 120
      ) {
        birthDate = subYears(new Date(), userProfile.age);
      }

      setEditData({
        birthDate,
        gender: userProfile.gender || "male",
        weight: weightDisplay ? weightDisplay.toString() : "",
        weightUnit,
        height: heightDisplay ? heightDisplay.toString() : "",
        heightUnit,
        activityLevel: userProfile.activityLevel || "moderate",
        language: userProfile.language || "es",
      });
    }
    setEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!editData.birthDate) {
      toast({
        title: "Fecha de nacimiento",
        description: "Selecciona tu fecha de nacimiento.",
        variant: "destructive",
      });
      return;
    }

    const birthIso = formatDateOnlyLocal(editData.birthDate);
    const computedAge = calculateAgeFromBirthDateString(birthIso);
    if (
      computedAge === null ||
      computedAge < 13 ||
      computedAge > 120
    ) {
      toast({
        title: "Fecha no válida",
        description: "La edad debe estar entre 13 y 120 años.",
        variant: "destructive",
      });
      return;
    }

    setSaveProfilePending(true);
    try {
      // Convert values to standard units for storage
      const weightValue = parseFloat(editData.weight) || 0;
      const heightValue = parseFloat(editData.height) || 0;

      const weightInKg = convertWeight(weightValue, editData.weightUnit, "kg");
      const heightInCm = convertHeight(heightValue, editData.heightUnit, "cm");

      // Cifrado de datos sensibles antes de guardar
      const encryptedWeight = await encryptData(weightInKg.toString(), user.uid);
      const encryptedHeight = await encryptData(heightInCm.toString(), user.uid);

      await updateUserProfile(user.uid, {
        birthDate: birthIso,
        age: computedAge,
        gender: editData.gender,
        weight: encryptedWeight,
        height: encryptedHeight,
        weightUnit: editData.weightUnit,
        heightUnit: editData.heightUnit,
        activityLevel: editData.activityLevel,
        language: editData.language,
      });

      await refreshUserProfile();
      setEditModalOpen(false);
      toast({
        title: "Perfil actualizado",
        description: "Tus datos sensibles han sido cifrados localmente.",
      });
    } catch (error) {
      logger.error("Error updating profile", error);
    } finally {
      setSaveProfilePending(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    const confirmed = window.confirm(
      "¿Estás seguro de que quieres eliminar tu cuenta? Esta acción es irreversible y perderás todo tu historial de comidas y fotos."
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
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
      setLoading(false);
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

  // Handle unit changes with automatic conversion
  const handleWeightUnitChange = (newUnit: "kg" | "lbs") => {
    const currentValue = parseFloat(editData.weight) || 0;
    if (currentValue <= 0) {
      setEditData((prev) => ({ ...prev, weightUnit: newUnit }));
      return;
    }

    const convertedValue = convertWeight(
      currentValue,
      editData.weightUnit,
      newUnit
    );

    setEditData((prev) => ({
      ...prev,
      weight: convertedValue.toString(),
      weightUnit: newUnit,
    }));
  };

  const handleHeightUnitChange = (newUnit: "cm" | "inches") => {
    const currentValue = parseFloat(editData.height) || 0;
    if (currentValue <= 0) {
      setEditData((prev) => ({ ...prev, heightUnit: newUnit }));
      return;
    }

    const convertedValue = convertHeight(
      currentValue,
      editData.heightUnit,
      newUnit
    );

    setEditData((prev) => ({
      ...prev,
      height: convertedValue.toString(),
      heightUnit: newUnit,
    }));
  };

  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Usuario";
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: "daily", label: "Hoy" },
    { value: "weekly", label: "7 días" },
    { value: "monthly", label: "30 días" },
    { value: "quarterly", label: "Trim." },
    { value: "semi-annual", label: "Sem." },
    { value: "annual", label: "Año" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28 md:pb-10">
        <div className="h-40 border-b border-border/60 bg-muted/30" />
        <div className="flex justify-center py-24">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 pb-28 pt-16 text-center md:pb-10">
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Button
          onClick={loadMealsAndStats}
          variant="outline"
          className="mt-6 rounded-xl"
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-background to-chart-2/[0.06]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />

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
                onClick={() => logout()}
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
                onClick={openEditModal}
                className="h-12 gap-2 rounded-2xl border-border/40 bg-card/40 px-6 font-bold shadow-sm backdrop-blur-md transition-all hover:bg-card"
              >
                <Edit className="h-4 w-4" />
                Editar Perfil
              </Button>
            </div>
          </div>

          {userProfile ? (
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Edad", value: `${getProfileDisplayAge(userProfile) ?? "—"} años`, icon: CalendarDays },
                { 
                  label: "Peso", 
                  value: typeof userProfile.weight === 'string' ? "Cifrado 🔒" : formatWeightDisplay(userProfile.weight || 0), 
                  icon: Target 
                },
                { 
                  label: "Altura", 
                  value: typeof userProfile.height === 'string' ? "Cifrado 🔒" : formatHeightDisplay(userProfile.height || 0), 
                  icon: TrendingUp 
                }
              ].map((item) => (
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
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-8 sm:px-8">
        <section className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Estadísticas</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {periodOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePeriodChange(value)}
                  aria-pressed={selectedPeriod === value}
                  className={cn(
                    "shrink-0 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all",
                    selectedPeriod === value
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-card/40 text-muted-foreground border border-border/40 hover:bg-card hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Comidas", value: stats.totalMeals, icon: Target, color: "text-chart-1", bg: "bg-chart-1/10" },
                  { label: "Kcal Media", value: stats.averageCalories, icon: TrendingUp, color: "text-chart-3", bg: "bg-chart-3/10" },
                  { label: "Kcal Totales", value: stats.totalCalories.toLocaleString(), icon: Flame, color: "text-primary", bg: "bg-primary/10" },
                  { label: "En Período", value: stats.weeklyMeals, icon: CalendarIcon, color: "text-chart-2", bg: "bg-chart-2/10" }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[2rem] border border-border/40 bg-card/40 p-6 shadow-xl shadow-black/[0.02] backdrop-blur-sm transition-transform hover:-translate-y-1">
                    <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-2xl", stat.bg, stat.color)}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <p className="text-3xl font-black tabular-nums tracking-tighter">{stat.value}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-5">
                <Card className="rounded-[2.5rem] border border-border/40 bg-card/40 shadow-xl shadow-black/[0.02] backdrop-blur-sm overflow-hidden h-full">
                  <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Acumulado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 space-y-4">
                    {[
                      { label: "Proteína", value: stats.totalProtein, unit: "g", color: "bg-chart-1" },
                      { label: "Carbos", value: stats.totalCarbs, unit: "g", color: "bg-chart-2" },
                      { label: "Grasas", value: stats.totalFat, unit: "g", color: "bg-chart-4" },
                      { label: "Fibra", value: stats.totalFiber, unit: "g", color: "bg-chart-3" },
                      { label: "Azúcar", value: stats.totalSugar, unit: "g", color: "bg-chart-5" }
                    ].map((row) => (
                      <div key={row.label} className="group">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{row.label}</span>
                          <span className="text-sm font-black tabular-nums">{Math.round(row.value)}{row.unit}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted shadow-inner overflow-hidden">
                          <div className={cn("h-full rounded-full opacity-60", row.color)} style={{ width: "60%" }} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-7">
                <MealCalendar />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-black tracking-tight text-foreground">Conectividad y Avisos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PushNotificationManager />

            <div className="flex items-center justify-between rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-xl shadow-black/[0.02] backdrop-blur-sm transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white shadow-lg">
                  <Apple className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Apple Health</p>
                  <p className="text-[10px] text-muted-foreground">Sincroniza pasos y actividad.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast({ title: "HealthKit", description: "Conexión simulada con éxito." })}
                className="rounded-xl font-bold border-primary/20 hover:bg-primary/5"
              >
                Conectar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-xl shadow-black/[0.02] backdrop-blur-sm transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-lg">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Biometría</p>
                  <p className="text-[10px] text-muted-foreground">FaceID / Huella dactilar.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast({ title: "WebAuthn", description: "Biometría activada (Simulación)." })}
                className="rounded-xl font-bold border-primary/20 hover:bg-primary/5"
              >
                Activar
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-[2rem] border border-border/40 bg-card/40 p-5 shadow-xl shadow-black/[0.02] backdrop-blur-sm transition-transform hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-chart-2/10 text-chart-2 shadow-lg">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Reporte Email</p>
                  <p className="text-[10px] text-muted-foreground">Resumen semanal de progreso.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast({ title: "Email Marketing", description: "Suscripción actualizada." })}
                className="rounded-xl font-bold border-primary/20 hover:bg-primary/5"
              >
                Suscrito
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-6 pb-20">
          <h2 className="text-2xl font-black tracking-tight text-foreground">Logros y Medallas</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ACHIEVEMENTS_MAP).map(([id, info]) => {
              const isUnlocked = userProfile?.achievements?.includes(id);
              const Icon = info.icon;
              return (
                <div 
                  key={id} 
                  className={cn(
                    "relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-500",
                    isUnlocked 
                      ? "border-border/40 bg-card/40 shadow-xl shadow-black/[0.02] grayscale-0 opacity-100" 
                      : "border-dashed border-border/20 bg-muted/5 grayscale opacity-40"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner",
                      isUnlocked ? info.bg : "bg-muted"
                    )}>
                      <Icon className={cn("h-7 w-7", isUnlocked ? info.color : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="font-black text-foreground">{info.label}</p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground leading-snug">{info.desc}</p>
                    </div>
                  </div>
                  {!isUnlocked && (
                    <div className="absolute top-2 right-4">
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-muted-foreground/20 text-muted-foreground/40">Bloqueado</Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="pt-8 border-t border-border/40">
          <div className="rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/5 via-card/50 to-card/50 p-8 shadow-2xl shadow-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h3 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                <Dumbbell className="h-6 w-6 text-primary" />
                Body Matter
              </h3>
              <p className="mt-2 text-sm font-medium text-muted-foreground/80 max-w-sm">
                Potencia tu entrenamiento con nuestra plataforma hermana. Sincroniza tus macros y entrena de forma inteligente.
              </p>
            </div>
            <Button size="lg" asChild className="rounded-2xl font-black h-14 px-8 shadow-xl shadow-primary/20">
              <a href={getBodyMatterPublicOrigin()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                Explorar Body Matter
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>

        <section className="pt-12 border-t border-border/40">
          <div className="rounded-[2rem] border border-destructive/20 bg-destructive/5 p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h3 className="text-xl font-black tracking-tight text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Zona de Peligro
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground/80 max-w-sm">
                Eliminar tu cuenta borrará permanentemente todos tus registros. Te recomendamos descargar tus datos antes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={handleExportData}
                disabled={exporting}
                className="rounded-2xl font-black h-12 px-6 border-destructive/20 text-destructive hover:bg-destructive/5"
              >
                {exporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar mis Datos (GDPR)
                  </>
                )}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                className="rounded-2xl font-black h-12 px-8 shadow-xl shadow-destructive/20"
              >
                Eliminar Cuenta Definitivamente
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent
          className="sm:max-w-lg"
          onInteractOutside={(event) => {
            if (isRadixPortalLayerTarget(event.target)) {
              event.preventDefault();
            }
          }}
          onPointerDownOutside={(event) => {
            if (isRadixPortalLayerTarget(event.target)) {
              event.preventDefault();
            }
          }}
          onFocusOutside={(event) => {
            if (isRadixPortalLayerTarget(event.target)) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fecha de nacimiento</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Elige el día en el calendario.
              </p>
              <div className="mt-2 max-h-[min(340px,45vh)] overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-card p-2">
                <Calendar
                  mode="single"
                  locale={esLocale}
                  selected={editData.birthDate}
                  defaultMonth={
                    editData.birthDate ?? subYears(new Date(), 25)
                  }
                  onSelect={(d) =>
                    setEditData((prev) => ({
                      ...prev,
                      birthDate: d ?? prev.birthDate,
                    }))
                  }
                  disabled={(date) => {
                    const d = startOfDay(date);
                    const todayStart = startOfDay(new Date());
                    const youngestBirth = startOfDay(subYears(todayStart, 13));
                    const oldestBirth = startOfDay(subYears(todayStart, 120));
                    return (
                      isAfter(d, youngestBirth) || isBefore(d, oldestBirth)
                    );
                  }}
                  captionLayout="dropdown"
                  fromYear={new Date().getFullYear() - 120}
                  toYear={new Date().getFullYear() - 13}
                  className="mx-auto w-fit"
                />
              </div>
              {editData.birthDate ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {format(editData.birthDate, "PPP", { locale: esLocale })}
                  </span>
                  {" · "}
                  Edad calculada:{" "}
                  {calculateAgeFromBirthDateString(
                    formatDateOnlyLocal(editData.birthDate)
                  ) ?? "—"}{" "}
                  años
                </p>
              ) : null}
            </div>

            <div>
              <Label>Sexo</Label>
              <RadioGroup
                value={editData.gender}
                onValueChange={(value) =>
                  setEditData((prev) => ({
                    ...prev,
                    gender: value as "male" | "female" | "other",
                  }))
                }
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="edit-male" />
                  <Label htmlFor="edit-male">Masculino</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="edit-female" />
                  <Label htmlFor="edit-female">Femenino</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="edit-other" />
                  <Label htmlFor="edit-other">Otro</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="edit-weight">Peso</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="edit-weight"
                  type="number"
                  value={editData.weight}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      weight: e.target.value,
                    }))
                  }
                  min={editData.weightUnit === "kg" ? "30" : "66"}
                  max={editData.weightUnit === "kg" ? "300" : "661"}
                  step="0.1"
                  className="flex-1"
                />
                <Select
                  value={editData.weightUnit}
                  onValueChange={handleWeightUnitChange}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-height">Altura</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="edit-height"
                  type="number"
                  value={editData.height}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      height: e.target.value,
                    }))
                  }
                  min={editData.heightUnit === "cm" ? "100" : "39"}
                  max={editData.heightUnit === "cm" ? "250" : "98"}
                  step="0.1"
                  className="flex-1"
                />
                <Select
                  value={editData.heightUnit}
                  onValueChange={handleHeightUnitChange}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="inches">inches</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Nivel de Actividad</Label>
              <Select
                value={editData.activityLevel}
                onValueChange={(value) =>
                  setEditData((prev) => ({
                    ...prev,
                    activityLevel: value as typeof editData.activityLevel,
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentario</SelectItem>
                  <SelectItem value="light">Ligero</SelectItem>
                  <SelectItem value="moderate">Moderado</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="very_active">Muy Activo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Idioma de la IA</Label>
              <Select
                value={editData.language}
                onValueChange={(value) =>
                  setEditData((prev) => ({
                    ...prev,
                    language: value,
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProfile}
              className="flex-1"
              disabled={saveProfilePending}
            >
              {saveProfilePending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
