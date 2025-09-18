"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { getTodayStats } from "@/lib/meals";
import { History, LogOut, TrendingUp, Calendar, Camera } from "lucide-react";
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

  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) {
      loadTodayStats();
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

      {/* Dashboard Content */}
      <div className="p-4 max-w-md mx-auto">
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-primary/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {todayStats.totalCalories}
                </div>
                <div className="text-sm text-muted-foreground">
                  Calorías Hoy
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/10">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-secondary" />
                </div>
                <div className="text-2xl font-bold text-secondary">
                  {todayStats.mealsCount}
                </div>
                <div className="text-sm text-muted-foreground">Comidas Hoy</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
              <div className="space-y-4">
                {/* Placeholder for recent meals */}
                <div className="text-sm text-muted-foreground text-center">
                  No hay actividad reciente
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress */}
          <Card className="bg-card">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Progreso Semanal</h2>
              <div className="h-48 flex items-center justify-center">
                {/* Placeholder for chart */}
                <div className="text-sm text-muted-foreground">
                  Gráfico de progreso semanal
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}