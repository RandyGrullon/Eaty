"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useCalorieTracker } from "@/hooks/use-calorie-tracker";
import { getTodayStats, getRecentActivities, getWeeklyProgress } from "@/lib/meals";
import { TipsCarousel } from "../home/tips-carousel";
import { CalorieLoader } from "@/components/ui/calorie-loader";
import {
  History,
  LogOut,
  TrendingUp,
  Calendar,
  Camera,
  Target,
  Flame,
  Clock,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";
import { useState, useEffect } from "react";

export function DashboardScreen({
  onViewHistory,
}: {
  onViewHistory: () => void;
}) {
  const [todayStats, setTodayStats] = useState({
    mealsCount: 0,
    totalCalories: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const { user, logout } = useAuth();
  const {
    calorieData,
    loading: calorieLoading,
    error: calorieError,
    refreshData,
  } = useCalorieTracker();

  useEffect(() => {
    if (user) {
      loadTodayStats();
      loadRecentActivities();
      loadWeeklyProgress();
    }
  }, [user]);

  const loadTodayStats = async () => {
    if (!user) return;
    try {
      const stats = await getTodayStats(user.uid);
      setTodayStats(stats);
      // Refresh calorie data when stats change
      refreshData();
    } catch (error) {
      console.error("Error loading today stats:", error);
    }
  };

  const loadRecentActivities = async () => {
    if (!user) return;
    setLoadingActivities(true);
    try {
      const activities = await getRecentActivities(user.uid, 3);
      setRecentActivities(activities);
    } catch (error) {
      console.error("Error loading recent activities:", error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadWeeklyProgress = async () => {
    if (!user) return;
    setLoadingProgress(true);
    try {
      const progress = await getWeeklyProgress(user.uid);
      setWeeklyProgress(progress);
    } catch (error) {
      console.error("Error loading weekly progress:", error);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Eaty</h1>
            <p className="text-sm opacity-90">
              Hola, {user?.displayName || user?.email?.split("@")[0]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewHistory}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <History className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-4 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-primary/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {todayStats.totalCalories}
                </div>
                <div className="text-sm text-muted-foreground">
                  Calorías Hoy
                </div>
              </CardContent>
            </Card>

            {calorieLoading ? (
              <CalorieLoader />
            ) : calorieError ? (
              <Card className="bg-destructive/10">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="text-sm text-destructive">
                    Error calculando calorías
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshData}
                    className="mt-2"
                  >
                    Reintentar
                  </Button>
                </CardContent>
              </Card>
            ) : calorieData ? (
              <Card
                className={`bg-secondary/10 ${
                  calorieData.remaining < 0 ? "bg-orange-500/10" : ""
                }`}
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                      calorieData.remaining < 0
                        ? "bg-orange-500/20"
                        : "bg-secondary/20"
                    }`}
                  >
                    <Target
                      className={`h-6 w-6 ${
                        calorieData.remaining < 0
                          ? "text-orange-500"
                          : "text-secondary"
                      }`}
                    />
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      calorieData.remaining < 0
                        ? "text-orange-500"
                        : "text-secondary"
                    }`}
                  >
                    {calorieData.remaining}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Calorías Restantes
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Meta: {calorieData.dailyGoal}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Complete su perfil
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tips Carousel */}
          <TipsCarousel />

          {/* Calorie Details */}
          {calorieData && !calorieLoading && !calorieError && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Detalles de Calorías
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {calorieData.macros.protein}g
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Proteína
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {calorieData.macros.carbs}g
                      </div>
                      <div className="text-sm text-muted-foreground">Carbs</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {calorieData.macros.fat}g
                      </div>
                      <div className="text-sm text-muted-foreground">Grasa</div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      <strong>BMR:</strong> {calorieData.bmr} cal •{" "}
                      <strong>TDEE:</strong> {calorieData.tdee} cal
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {calorieData.explanation}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
              <div className="space-y-4">
                {loadingActivities ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : recentActivities.length > 0 ? (
                  recentActivities.map((meal) => (
                    <div key={meal.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {meal.imageUrl ? (
                          <img
                            src={meal.imageUrl}
                            alt={meal.foodName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{meal.foodName}</h4>
                        <p className="text-xs text-muted-foreground">
                          {meal.createdAt.toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary">
                          {meal.calories} cal
                        </div>
                        <div className="text-xs text-muted-foreground">
                          P:{meal.macros.protein}g C:{meal.macros.carbs}g
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No hay actividad reciente
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress */}
          <Card className="bg-card">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Progreso Semanal</h2>
              {loadingProgress ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : weeklyProgress ? (
                <div className="space-y-4">
                  {/* Progress Overview */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">
                        {weeklyProgress.currentWeek.totalMeals}
                      </div>
                      <div className="text-xs text-muted-foreground">Comidas</div>
                      <div className={`text-xs flex items-center justify-center gap-1 mt-1 ${
                        weeklyProgress.progress.mealsChange > 0 ? 'text-green-600' :
                        weeklyProgress.progress.mealsChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {weeklyProgress.progress.mealsChange > 0 && <TrendingUpIcon className="h-3 w-3" />}
                        {weeklyProgress.progress.mealsChange < 0 && <TrendingDown className="h-3 w-3" />}
                        {Math.abs(weeklyProgress.progress.mealsChange)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {weeklyProgress.currentWeek.totalCalories}
                      </div>
                      <div className="text-xs text-muted-foreground">Calorías</div>
                      <div className={`text-xs flex items-center justify-center gap-1 mt-1 ${
                        weeklyProgress.progress.caloriesChange > 0 ? 'text-green-600' :
                        weeklyProgress.progress.caloriesChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {weeklyProgress.progress.caloriesChange > 0 && <TrendingUpIcon className="h-3 w-3" />}
                        {weeklyProgress.progress.caloriesChange < 0 && <TrendingDown className="h-3 w-3" />}
                        {Math.abs(weeklyProgress.progress.caloriesChange)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {weeklyProgress.currentWeek.daysActive}
                      </div>
                      <div className="text-xs text-muted-foreground">Días activos</div>
                      <div className={`text-xs flex items-center justify-center gap-1 mt-1 ${
                        weeklyProgress.progress.daysChange > 0 ? 'text-green-600' :
                        weeklyProgress.progress.daysChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {weeklyProgress.progress.daysChange > 0 && <TrendingUpIcon className="h-3 w-3" />}
                        {weeklyProgress.progress.daysChange < 0 && <TrendingDown className="h-3 w-3" />}
                        {Math.abs(weeklyProgress.progress.daysChange)}%
                      </div>
                    </div>
                  </div>

                  {/* Weekly Comparison */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-3">Comparación semanal</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Esta semana</span>
                          <span>{weeklyProgress.currentWeek.totalMeals} comidas</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${Math.min((weeklyProgress.currentWeek.totalMeals / Math.max(weeklyProgress.previousWeek.totalMeals + weeklyProgress.currentWeek.totalMeals, 7)) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Semana anterior</span>
                          <span>{weeklyProgress.previousWeek.totalMeals} comidas</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-muted-foreground/30 h-2 rounded-full"
                            style={{
                              width: `${Math.min((weeklyProgress.previousWeek.totalMeals / Math.max(weeklyProgress.previousWeek.totalMeals + weeklyProgress.currentWeek.totalMeals, 7)) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <div className="text-sm text-muted-foreground">
                    No hay datos de progreso semanal
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
