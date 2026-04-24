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
} from "lucide-react";
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
import { getUserMeals, getUserProfile, updateUserProfile } from "@/lib/meals";
import type { Meal, UserProfile } from "@/types/meal";

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

export function ProfilePage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
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
  });
  const { user } = useAuth();
  const { toast } = useToast();

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
      const [userMeals, profile] = await Promise.all([
        getUserMeals(user.uid),
        getUserProfile(user.uid),
      ]);

      setMeals(userMeals);
      setUserProfile(profile);
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
      const weightKg = userProfile.weight || 0;
      const heightCm = userProfile.height || 0;

      const weightUnit: "kg" | "lbs" = userProfile.weightUnit ?? "kg";
      const heightUnit: "cm" | "inches" = userProfile.heightUnit ?? "cm";

      const weightDisplay =
        weightUnit === "lbs"
          ? Math.round(weightKg * 2.20462 * 10) / 10
          : weightKg;
      const heightDisplay =
        heightUnit === "inches"
          ? Math.round((heightCm / 2.54) * 10) / 10
          : heightCm;

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

    setProfileLoading(true);
    try {
      // Convert values to standard units for storage
      const weightValue = parseFloat(editData.weight) || 0;
      const heightValue = parseFloat(editData.height) || 0;

      const weightInKg = convertWeight(weightValue, editData.weightUnit, "kg");
      const heightInCm = convertHeight(heightValue, editData.heightUnit, "cm");

      await updateUserProfile(user.uid, {
        birthDate: birthIso,
        age: computedAge,
        gender: editData.gender,
        weight: weightInKg,
        height: heightInCm,
        weightUnit: editData.weightUnit,
        heightUnit: editData.heightUnit,
        activityLevel: editData.activityLevel,
      });

      // Recargar el perfil
      const updatedProfile = await getUserProfile(user.uid);
      setUserProfile(updatedProfile);
      setEditModalOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setProfileLoading(false);
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
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.09] via-background to-chart-2/[0.07]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-0 top-0 h-72 w-72 translate-x-1/4 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 pb-10 pt-10 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Perfil
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={openEditModal}
              className="shrink-0 gap-2 self-start rounded-xl border-border/80 bg-card/90 shadow-sm sm:self-auto"
            >
              <Edit className="h-4 w-4" />
              Editar datos
            </Button>
          </div>

          {userProfile ? (
            <div className="mt-8 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Edad
                </p>
                <p className="mt-0.5 font-medium text-foreground">
                  {getProfileDisplayAge(userProfile) ?? "—"} años
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Peso
                </p>
                <p className="mt-0.5 font-medium text-foreground">
                  {formatWeightDisplay(userProfile.weight || 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-3 text-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Altura
                </p>
                <p className="mt-0.5 font-medium text-foreground">
                  {formatHeightDisplay(userProfile.height || 0)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rango de estadísticas
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {periodOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePeriodChange(value)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  selectedPeriod === value
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border/80 bg-card/90 text-muted-foreground hover:border-primary/25 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 text-center shadow-sm sm:p-5">
                <Target className="mx-auto mb-2 h-4 w-4 text-chart-1" />
                <p className="text-2xl font-bold tabular-nums text-chart-1">
                  {stats.totalMeals}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Comidas
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 text-center shadow-sm sm:p-5">
                <TrendingUp className="mx-auto mb-2 h-4 w-4 text-chart-3" />
                <p className="text-2xl font-bold tabular-nums text-chart-3">
                  {stats.averageCalories}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Kcal media
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 text-center shadow-sm sm:p-5">
                <Flame className="mx-auto mb-2 h-4 w-4 text-primary" />
                <p className="text-2xl font-bold tabular-nums text-primary">
                  {stats.totalCalories.toLocaleString()}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Kcal totales
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-card/90 p-4 text-center shadow-sm sm:p-5">
                <CalendarIcon className="mx-auto mb-2 h-4 w-4 text-chart-2" />
                <p className="text-2xl font-bold tabular-nums text-chart-2">
                  {stats.weeklyMeals}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  En período
                </p>
              </div>
            </div>

            <Card className="border-primary/10 shadow-md shadow-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {getPeriodLabel(selectedPeriod)}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-6 pt-0 sm:gap-8">
                <div className="rounded-xl bg-muted/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Comidas</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
                    {stats.weeklyMeals}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/30 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Calorías</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
                    {stats.weeklyCalories.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20 pb-3">
                <CardTitle className="text-base font-semibold">
                  Acumulado en el período
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-0 divide-y divide-border/60 p-0 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                {[
                  {
                    label: "Calorías",
                    value: `${stats.totalCalories.toLocaleString()} kcal`,
                  },
                  {
                    label: "Proteína",
                    value: `${Math.round(stats.totalProtein)} g`,
                  },
                  {
                    label: "Carbohidratos",
                    value: `${Math.round(stats.totalCarbs)} g`,
                  },
                  { label: "Grasas", value: `${Math.round(stats.totalFat)} g` },
                  {
                    label: "Fibra",
                    value: `${Math.round(stats.totalFiber)} g`,
                  },
                  {
                    label: "Azúcar",
                    value: `${Math.round(stats.totalSugar)} g`,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5"
                  >
                    <span className="text-sm text-muted-foreground">
                      {row.label}
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {row.value}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <MealCalendar />
          </>
        )}

        {!stats || stats.totalMeals === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Award className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-foreground">
              Sin datos en este rango
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Registra comidas desde Escanear para ver métricas y calendario.
            </p>
          </div>
        ) : null}
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
              disabled={profileLoading}
            >
              {profileLoading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
