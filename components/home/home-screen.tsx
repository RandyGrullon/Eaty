"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import {
  getTodayStats,
  getRecentActivities,
  getWeeklyProgress,
} from "@/lib/meals";
import type { Meal } from "@/types/meal";
import {
  Camera,
  Upload,
  Type,
  History,
  LogOut,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";

interface HomeScreenProps {
  onScanFood: (imageFile?: File, foodName?: string) => void;
  onViewHistory: () => void;
  onImageSelected?: (file: File) => void;
}

export function HomeScreen({
  onScanFood,
  onViewHistory,
  onImageSelected,
}: HomeScreenProps) {
  const [foodName, setFoodName] = useState("");
  const [todayStats, setTodayStats] = useState({
    mealsCount: 0,
    totalCalories: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Meal[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<{
    currentWeek: {
      totalMeals: number;
      totalCalories: number;
      averageCalories: number;
      daysActive: number;
    };
    previousWeek: {
      totalMeals: number;
      totalCalories: number;
      averageCalories: number;
      daysActive: number;
    };
    progress: {
      mealsChange: number;
      caloriesChange: number;
      daysChange: number;
    };
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { user, logout } = useAuth();

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
    } catch (error) {
      console.error("Error loading today stats:", error);
    }
  };

  const loadRecentActivities = async () => {
    if (!user) return;
    try {
      const activities = await getRecentActivities(user.uid, 3);
      setRecentActivities(activities);
    } catch (error) {
      console.error("Error loading recent activities:", error);
    }
  };

  const loadWeeklyProgress = async () => {
    if (!user) return;
    try {
      const progress = await getWeeklyProgress(user.uid);
      setWeeklyProgress(progress);
    } catch (error) {
      console.error("Error loading weekly progress:", error);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onImageSelected) {
        onImageSelected(file);
      } else {
        onScanFood(file);
      }
    }
  };

  const handleTextAnalysis = () => {
    if (foodName.trim()) {
      onScanFood(undefined, foodName.trim());
      setFoodName("");
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
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">NutriScan AI</h1>
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

      {/* Main Content */}
      <div className="p-4 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card className="bg-card">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-card-foreground mb-2">
                  Analiza tu comida
                </h2>
                <p className="text-muted-foreground text-sm">
                  Toma una foto o escribe el nombre de tu plato para obtener
                  información nutricional completa
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scan Options */}
          <div className="space-y-4">
            {/* Camera Scan */}
            <Button
              onClick={handleCameraCapture}
              className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90"
            >
              <Camera className="mr-3 h-6 w-6" />
              Tomar Foto
            </Button>

            {/* Upload from Gallery */}
            <Button
              onClick={handleFileUpload}
              variant="outline"
              className="w-full h-14 text-lg font-semibold border-primary text-primary hover:bg-primary/5 bg-transparent"
            >
              <Upload className="mr-3 h-6 w-6" />
              Subir desde Galería
            </Button>

            {/* Text Input Alternative */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-sm text-muted-foreground px-2">
                  O escribe el nombre
                </span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Ej: Pizza margarita, ensalada césar..."
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && handleTextAnalysis()}
                />
                <Button
                  onClick={handleTextAnalysis}
                  disabled={!foodName.trim()}
                  className="px-4"
                >
                  <Type className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats Card - Updated with real data */}
          <Card className="bg-secondary/10 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-secondary">
                    {todayStats.mealsCount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Comidas hoy
                  </div>
                </div>
                <div className="w-px h-12 bg-border"></div>
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-secondary">
                    {todayStats.totalCalories}
                  </div>
                  <div className="text-xs text-muted-foreground">Calorías</div>
                </div>
                <div className="w-px h-12 bg-border"></div>
                <div className="text-center flex-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onViewHistory}
                    className="flex flex-col h-auto p-2 text-secondary hover:bg-secondary/10"
                  >
                    <History className="h-6 w-6 mb-1" />
                    <span className="text-xs">Historial</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress Card */}
          {weeklyProgress && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">
                    Progreso Semanal
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-blue-700">
                      {weeklyProgress.currentWeek.totalMeals}
                    </div>
                    <div className="text-xs text-blue-600">Comidas</div>
                    {weeklyProgress.progress.mealsChange !== 0 && (
                      <div
                        className={`text-xs flex items-center justify-center gap-1 mt-1 ${
                          weeklyProgress.progress.mealsChange > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {weeklyProgress.progress.mealsChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(weeklyProgress.progress.mealsChange)}%
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-700">
                      {weeklyProgress.currentWeek.totalCalories}
                    </div>
                    <div className="text-xs text-blue-600">Calorías</div>
                    {weeklyProgress.progress.caloriesChange !== 0 && (
                      <div
                        className={`text-xs flex items-center justify-center gap-1 mt-1 ${
                          weeklyProgress.progress.caloriesChange > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {weeklyProgress.progress.caloriesChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(weeklyProgress.progress.caloriesChange)}%
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-700">
                      {weeklyProgress.currentWeek.daysActive}
                    </div>
                    <div className="text-xs text-blue-600">Días activos</div>
                    {weeklyProgress.progress.daysChange !== 0 && (
                      <div
                        className={`text-xs flex items-center justify-center gap-1 mt-1 ${
                          weeklyProgress.progress.daysChange > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {weeklyProgress.progress.daysChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(weeklyProgress.progress.daysChange)}%
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activities Card */}
          {recentActivities.length > 0 && (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">
                    Actividades Recientes
                  </h3>
                </div>
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-2 bg-white/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-green-800 text-sm">
                          {activity.foodName}
                        </div>
                        <div className="text-xs text-green-600">
                          {activity.createdAt.toLocaleDateString("es-ES", {
                            weekday: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-700">
                          {activity.calories} cal
                        </div>
                        <div className="text-xs text-green-600">
                          {activity.macros.protein}g proteína
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips Card */}
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4">
              <h3 className="font-semibold text-accent mb-2 text-sm">
                💡 Consejo
              </h3>
              <p className="text-xs text-muted-foreground">
                Para mejores resultados, toma la foto con buena iluminación y
                asegúrate de que toda la comida sea visible.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
