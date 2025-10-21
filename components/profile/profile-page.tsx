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
  DialogTrigger,
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
  Calendar,
  TrendingUp,
  Target,
  Award,
  CalendarDays,
  Edit,
} from "lucide-react";
import { MealCalendar } from "./meal-calendar";
import { useAuth } from "@/hooks/use-auth";
import { getUserMeals, getUserProfile, updateUserProfile } from "@/lib/meals";
import type { Meal, UserProfile } from "@/types/meal";

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
  const [editData, setEditData] = useState({
    age: "",
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
    } catch (error: any) {
      setError(error.message);
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
      // Auto-detect preferred units based on profile values
      const weight = userProfile.weight || 0;
      const height = userProfile.height || 0;

      // Use imperial units if weight is > 200 lbs or height is > 100 inches (uncommon for metric)
      const weightUnit: "kg" | "lbs" = weight > 90 ? "kg" : "lbs"; // 200 lbs = ~90 kg
      const heightUnit: "cm" | "inches" = height > 250 ? "cm" : "inches"; // 250 cm = ~8'2"

      setEditData({
        age: userProfile.age?.toString() || "",
        gender: userProfile.gender || "male",
        weight: weight.toString(),
        weightUnit,
        height: height.toString(),
        heightUnit,
        activityLevel: userProfile.activityLevel || "moderate",
      });
    }
    setEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setProfileLoading(true);
    try {
      // Convert values to standard units for storage
      const weightValue = parseFloat(editData.weight) || 0;
      const heightValue = parseFloat(editData.height) || 0;

      const weightInKg = convertWeight(weightValue, editData.weightUnit, "kg");
      const heightInCm = convertHeight(heightValue, editData.heightUnit, "cm");

      await updateUserProfile(user.uid, {
        age: parseInt(editData.age),
        gender: editData.gender,
        weight: weightInKg,
        height: heightInCm,
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
    if (currentValue <= 0) return; // Don't convert if no valid value

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
    if (currentValue <= 0) return; // Don't convert if no valid value

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadMealsAndStats} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Tu progreso nutricional</p>
        </div>

        {/* User Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {user?.displayName ||
                      user?.email?.split("@")[0] ||
                      "Usuario"}
                  </h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  {userProfile && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Edad: {userProfile.age || "No especificada"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Peso: {formatWeightDisplay(userProfile.weight || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Altura: {formatHeightDisplay(userProfile.height || 0)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={openEditModal}
                className="p-2"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Time Period Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Periodo</span>
              </div>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semi-annual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {stats && (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalMeals}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Comidas totales
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.averageCalories}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cal promedio
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Period Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {getPeriodLabel(selectedPeriod)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">
                      {stats.weeklyMeals}
                    </div>
                    <div className="text-xs text-muted-foreground">Comidas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">
                      {stats.weeklyCalories}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Calorías
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Estadísticas Totales</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Calorías totales
                  </span>
                  <Badge variant="secondary">
                    {stats.totalCalories.toLocaleString()} cal
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Proteína total
                  </span>
                  <Badge variant="secondary">
                    {Math.round(stats.totalProtein)}g
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Carbohidratos totales
                  </span>
                  <Badge variant="secondary">
                    {Math.round(stats.totalCarbs)}g
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Grasas totales
                  </span>
                  <Badge variant="secondary">
                    {Math.round(stats.totalFat)}g
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Fibra total
                  </span>
                  <Badge variant="secondary">
                    {Math.round(stats.totalFiber)}g
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Azúcar total
                  </span>
                  <Badge variant="secondary">
                    {Math.round(stats.totalSugar)}g
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Calendar */}
            <MealCalendar />
          </>
        )}

        {/* Empty State */}
        {!stats || stats.totalMeals === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Sin datos aún
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Comienza a escanear tus comidas para ver tus estadísticas aquí
              </p>
              <Button className="w-full">Escanear Primera Comida</Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-age">Edad</Label>
              <Input
                id="edit-age"
                type="number"
                value={editData.age}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, age: e.target.value }))
                }
                min="13"
                max="120"
                className="mt-1"
              />
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
