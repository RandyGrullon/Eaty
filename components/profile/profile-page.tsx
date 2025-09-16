"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  Target,
  Award,
  CalendarDays,
} from "lucide-react";
import { MealCalendar } from "./meal-calendar";
import { useAuth } from "@/hooks/use-auth";
import { getUserMeals } from "@/lib/meals";
import type { Meal } from "@/types/meal";

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

export function ProfilePage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const userMeals = await getUserMeals(user.uid);
      setMeals(userMeals);
      calculateStats(userMeals);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (meals: Meal[]) => {
    if (meals.length === 0) {
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

    const totalMeals = meals.length;
    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    const averageCalories = Math.round(totalCalories / totalMeals);

    const totalProtein = meals.reduce(
      (sum, meal) => sum + meal.macros.protein,
      0
    );
    const totalCarbs = meals.reduce((sum, meal) => sum + meal.macros.carbs, 0);
    const totalFat = meals.reduce((sum, meal) => sum + meal.macros.fat, 0);
    const totalFiber = meals.reduce((sum, meal) => sum + meal.macros.fiber, 0);
    const totalSugar = meals.reduce((sum, meal) => sum + meal.macros.sugar, 0);

    // Calculate weekly stats (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyMealsData = meals.filter((meal) => meal.createdAt >= weekAgo);
    const weeklyMeals = weeklyMealsData.length;
    const weeklyCalories = weeklyMealsData.reduce(
      (sum, meal) => sum + meal.calories,
      0
    );

    setStats({
      totalMeals,
      totalCalories,
      averageCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber,
      totalSugar,
      weeklyMeals,
      weeklyCalories,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-md mx-auto">
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
        <div className="max-w-md mx-auto text-center py-12">
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
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">Tu progreso nutricional</p>
        </div>

        {/* User Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {user?.displayName || user?.email?.split("@")[0] || "Usuario"}
                </h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
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

            {/* Weekly Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Esta semana
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
    </div>
  );
}
