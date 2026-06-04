"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  Utensils,
  Clock,
  Trash2,
  CheckCircle2,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getUserMeals } from "@/lib/meals";
import { appFirebase } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import type { Meal } from "@/types/meal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfWeek, isSameDay, isToday, isFuture } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { PageHeader } from "@/components/app/page-header";

interface WeeklyPlannerProps {
  /** Abre "Escanear" recordando el día seleccionado para planificar esa comida. */
  onAddMeal: (date: Date) => void;
}

export function WeeklyPlanner({ onAddMeal }: WeeklyPlannerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [plannedMeals, setPlannedMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadPlannedMeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Por ahora traemos todas y filtramos isPlanned en el cliente
      // En una app real, haríamos una query específica en Firestore
      const allMeals = await getUserMeals(user.uid);
      setPlannedMeals(allMeals.filter(m => m.isPlanned));
    } catch (e) {
      logger.error("Error loading planned meals", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPlannedMeals();
  }, [loadPlannedMeals]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const mealsForSelectedDate = plannedMeals.filter(m => isSameDay(m.createdAt, selectedDate));
  const selectedDayKcal = mealsForSelectedDate.reduce((s, m) => s + m.calories, 0);

  /** Resumen por día de la semana visible: nº de comidas y kcal planificadas. */
  const weekSummary = useMemo(() => {
    return weekDays.map((day) => {
      const dayMeals = plannedMeals.filter((m) => isSameDay(m.createdAt, day));
      return {
        meals: dayMeals.length,
        kcal: dayMeals.reduce((s, m) => s + m.calories, 0),
      };
    });
  }, [weekDays, plannedMeals]);

  const weekTotalMeals = weekSummary.reduce((s, d) => s + d.meals, 0);
  const weekTotalKcal = weekSummary.reduce((s, d) => s + d.kcal, 0);

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      const mealRef = doc(appFirebase.db, "users", user.uid, "meals", id);
      await deleteDoc(mealRef);
      setPlannedMeals(prev => prev.filter(m => m.id !== id));
      toast({ title: "Plan eliminado", description: "La comida se quitó de tu plan semanal." });
    } catch (e) {
      logger.error("Error deleting plan", e);
    }
  };

  const handleComplete = async (meal: Meal) => {
    if (!user) return;
    try {
      const mealRef = doc(appFirebase.db, "users", user.uid, "meals", meal.id);
      await updateDoc(mealRef, { isPlanned: false, createdAt: new Date() });
      setPlannedMeals(prev => prev.filter(m => m.id !== meal.id));
      toast({ 
        title: "¡Buen provecho!", 
        description: `${meal.foodName} se ha movido a tu historial de hoy.`,
      });
    } catch (e) {
      logger.error("Error completing plan", e);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <PageHeader
        title="Planificador"
        subtitle="Organiza tu semana"
        actions={
          <>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        }
      >
        <div className="mt-8">
          <div className="flex justify-between gap-2 overflow-x-auto pb-4 scrollbar-none">
            {weekDays.map((day, i) => {
              const active = isSameDay(day, selectedDate);
              const today = isToday(day);
              const summary = weekSummary[i];
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative flex flex-col items-center min-w-[50px] py-3 rounded-2xl border transition-all duration-300",
                    active
                      ? "bg-primary border-primary text-primary-foreground shadow-lg scale-105"
                      : "bg-card/40 border-border/40 text-muted-foreground hover:bg-card"
                  )}
                >
                  {summary.meals > 0 && (
                    <span
                      className={cn(
                        "absolute -top-1.5 -right-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-black shadow",
                        active ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                      )}
                    >
                      {summary.meals}
                    </span>
                  )}
                  <span className="text-[10px] font-black uppercase opacity-60 mb-1">
                    {format(day, "eee", { locale: es })}
                  </span>
                  <span className="text-lg font-black">{day.getDate()}</span>
                  {summary.kcal > 0 ? (
                    <span className={cn("mt-1 text-[8px] font-bold tabular-nums", active ? "opacity-80" : "text-primary/70")}>
                      {summary.kcal}
                    </span>
                  ) : today && !active ? (
                    <div className="mt-1 h-1 w-1 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {weekTotalMeals > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-card/60 border border-border/40 px-4 py-1.5 text-[11px] font-bold backdrop-blur-sm">
                <span className="text-muted-foreground uppercase tracking-wider">Semana:</span>{" "}
                <span className="text-foreground">{weekTotalMeals} comidas</span>
              </div>
              <div className="rounded-full bg-card/60 border border-border/40 px-4 py-1.5 text-[11px] font-bold backdrop-blur-sm">
                <span className="text-muted-foreground uppercase tracking-wider">Total:</span>{" "}
                <span className="text-primary tabular-nums">{weekTotalKcal} kcal</span>
              </div>
            </div>
          )}
        </div>
      </PageHeader>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            {isToday(selectedDate) ? "Hoy" : format(selectedDate, "eeee d 'de' MMMM", { locale: es })}
          </h2>
          <div className="flex items-center gap-2">
            {selectedDayKcal > 0 && (
              <Badge variant="secondary" className="bg-chart-2/10 text-chart-2 border-none font-bold tabular-nums">
                {selectedDayKcal} kcal
              </Badge>
            )}
            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">
              {mealsForSelectedDate.length} planeadas
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
          </div>
        ) : mealsForSelectedDate.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-border/40 bg-muted/20 px-6 py-20 text-center">
            <div className="h-16 w-16 bg-card rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-border/40">
              <CalendarIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-black text-foreground">Sin planes para este día</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground max-w-xs mx-auto">
              Empieza a planificar tu alimentación para mantenerte en el camino hacia tus metas.
            </p>
            <Button
              className="mt-8 rounded-2xl font-black h-12 px-8 shadow-xl shadow-primary/20 gap-2"
              onClick={() => onAddMeal(selectedDate)}
            >
              <Plus className="h-5 w-5" />
              Añadir comida al plan
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {mealsForSelectedDate.map((meal) => (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative flex items-center gap-4 rounded-[2rem] border border-border/40 bg-card p-4 shadow-sm hover:shadow-xl hover:shadow-black/[0.02] transition-all"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-muted border border-border/40">
                    {meal.imageUrl ? (
                      <img src={meal.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Utensils className="h-6 w-6 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black tracking-tight truncate">{meal.foodName}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-bold text-primary">{meal.calories} kcal</span>
                      <div className="h-1 w-1 rounded-full bg-border" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Planeado
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl h-10 w-10 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                      onClick={() => handleComplete(meal)}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-xl h-10 w-10 text-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(meal.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            <Button
              variant="outline"
              className="w-full mt-4 rounded-2xl h-14 border-dashed border-border/60 hover:bg-muted/50 font-bold gap-2"
              onClick={() => onAddMeal(selectedDate)}
            >
              <Plus className="h-5 w-5" />
              Añadir otra comida
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
