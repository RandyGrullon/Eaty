"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Utensils,
  Clock,
  Trash2,
  CheckCircle2,
  Calendar as CalendarIcon,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { appFirebase } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import type { Meal } from "@/types/meal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfWeek, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { PageHeader } from "@/components/app/page-header";
import { MealThumb } from "@/components/meal/meal-thumb";

interface WeeklyPlannerProps {
  /** Abre "Escanear" recordando el día seleccionado para planificar esa comida. */
  onAddMeal: (date: Date) => void;
  /** Cierra el planificador (ahora se abre como overlay desde Inicio). */
  onClose?: () => void;
}

export function WeeklyPlanner({ onAddMeal, onClose }: WeeklyPlannerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user } = useAuth();
  const { meals, loading, deleteMeal, openMealEditor } = useAppData();
  const { toast } = useToast();

  const plannedMeals = useMemo(
    () => meals.filter((m) => m.isPlanned),
    [meals]
  );

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const mealsForSelectedDate = plannedMeals.filter((m) =>
    isSameDay(m.createdAt, selectedDate)
  );
  const selectedDayKcal = mealsForSelectedDate.reduce((s, m) => s + m.calories, 0);

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
    try {
      await deleteMeal(id);
      toast({ title: "Plan eliminado", description: "La comida se quitó de tu plan semanal." });
    } catch (e) {
      logger.error("Error deleting plan", e);
    }
  };

  const handleComplete = async (meal: Meal) => {
    if (!user) return;
    try {
      const mealRef = doc(appFirebase.db, "users", user.uid, "meals", meal.id);
      await updateDoc(mealRef, { isPlanned: false, createdAt: Timestamp.now() });
      toast({
        title: "¡Buen provecho!",
        description: `${meal.foodName} se ha movido a tu historial de hoy.`,
      });
    } catch (e) {
      logger.error("Error completing plan", e);
    }
  };

  return (
    <div className="min-h-full bg-background pb-32 md:pb-12">
      <PageHeader
        title="Planificador"
        subtitle="Organiza tu semana"
        leading={
          onClose ? (
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 shrink-0 rounded-full"
              aria-label="Volver al inicio"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : undefined
        }
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              aria-label="Semana siguiente"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        }
      >
        <div className="mt-6">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weekDays.map((day, i) => {
              const active = isSameDay(day, selectedDate);
              const today = isToday(day);
              const summary = weekSummary[i];
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  aria-pressed={active}
                  aria-label={`${format(day, "EEEE d", { locale: es })}${summary.meals > 0 ? `, ${summary.meals} ${summary.meals === 1 ? "comida" : "comidas"}` : ""}`}
                  className={cn(
                    "flex min-w-0 flex-col items-center rounded-2xl border py-2.5 transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : today
                        ? "border-primary/40 bg-card text-foreground hover:bg-muted"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className={cn("text-xs capitalize", active ? "opacity-85" : "text-muted-foreground")}>
                    {format(day, "eeeeee", { locale: es })}
                  </span>
                  <span className="font-display text-lg font-semibold leading-tight tabular">{day.getDate()}</span>
                  <span
                    className={cn(
                      "mt-0.5 h-4 text-[11px] leading-4 tabular",
                      active ? "opacity-85" : "text-primary"
                    )}
                  >
                    {summary.kcal > 0 ? summary.kcal : summary.meals > 0 ? summary.meals : ""}
                  </span>
                </button>
              );
            })}
          </div>

          {weekTotalMeals > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-muted/60 px-3 py-1 text-muted-foreground">
                Semana: <span className="font-medium text-foreground tabular">{weekTotalMeals} {weekTotalMeals === 1 ? "comida" : "comidas"}</span>
              </span>
              <span className="rounded-full bg-muted/60 px-3 py-1 text-muted-foreground">
                Total: <span className="font-medium text-primary tabular">{weekTotalKcal} kcal</span>
              </span>
            </div>
          )}
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-10">
        <section className="surface p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Utensils className="h-4 w-4" />
              </span>
              <h2 className="truncate text-lg font-semibold first-letter:uppercase">
                {isToday(selectedDate) ? "Hoy" : format(selectedDate, "eeee d 'de' MMMM", { locale: es })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {selectedDayKcal > 0 && (
                <Badge variant="secondary" className="rounded-full border-none bg-muted px-2.5 tabular">
                  {selectedDayKcal} kcal
                </Badge>
              )}
              <Badge variant="secondary" className="rounded-full border-none bg-primary/10 px-2.5 text-primary tabular">
                {mealsForSelectedDate.length} planeadas
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-14 w-14 animate-pulse rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : mealsForSelectedDate.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
              <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <h3 className="mt-3 font-semibold">Sin planes para este día</h3>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Planifica tus comidas para mantenerte en camino a tu meta.
              </p>
              <Button className="mt-4 h-11 rounded-full px-6" onClick={() => onAddMeal(selectedDate)}>
                <Plus className="h-4 w-4" />
                Añadir comida al plan
              </Button>
            </div>
          ) : (
            <>
              <ul className="-mx-2 divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {mealsForSelectedDate.map((meal) => (
                    <motion.li
                      key={meal.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center gap-2 px-2 py-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => openMealEditor(meal)}
                        className="-my-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left transition-colors hover:bg-muted/70"
                      >
                        <MealThumb src={meal.imageUrl} className="h-14 w-14 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{meal.foodName}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground tabular">
                            <span className="font-medium text-foreground">{meal.calories} kcal</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Planeado
                            </span>
                          </p>
                        </div>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full text-success hover:bg-success/10 hover:text-success"
                          onClick={() => handleComplete(meal)}
                          aria-label="Marcar como comida de hoy"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDelete(meal.id)}
                          aria-label="Eliminar del plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <Button
                variant="outline"
                className="mt-4 h-11 w-full rounded-full border-dashed"
                onClick={() => onAddMeal(selectedDate)}
              >
                <Plus className="h-4 w-4" />
                Añadir otra comida
              </Button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
