"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Utensils } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getMealsGroupedByDate } from "@/lib/meals";
import type { Meal } from "@/types/meal";
import { cn } from "@/lib/utils";

interface MealCalendarProps {
  onDateSelect?: (date: Date, meals: Meal[]) => void;
}

export function MealCalendar({ onDateSelect }: MealCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mealsByDate, setMealsByDate] = useState<{ [key: string]: Meal[] }>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { user } = useAuth();

  const loadMealsForMonth = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const startOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      );

      const groupedMeals = await getMealsGroupedByDate(
        user.uid,
        startOfMonth,
        endOfMonth
      );
      setMealsByDate(groupedMeals);
    } catch (error) {
      console.error("Error loading meals for month:", error);
    } finally {
      setLoading(false);
    }
  }, [user, currentDate]);

  useEffect(() => {
    if (user) {
      void loadMealsForMonth();
    }
  }, [user, loadMealsForMonth]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getMealsForDate = (date: Date) => {
    const dateKey = date.toDateString();
    return mealsByDate[dateKey] || [];
  };

  const getTotalCaloriesForDate = (date: Date) => {
    const meals = getMealsForDate(date);
    return meals.reduce((sum, meal) => sum + meal.calories, 0);
  };

  const getMealCountForDate = (date: Date) => {
    return getMealsForDate(date).length;
  };

  const handleDateClick = (date: Date) => {
    const meals = getMealsForDate(date);
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date, meals);
    }
  };

  const getDateClasses = (date: Date | null) => {
    if (!date) return "bg-muted/50";

    const isToday = date.toDateString() === new Date().toDateString();
    const isSelected = selectedDate?.toDateString() === date.toDateString();
    const hasMeals = getMealCountForDate(date) > 0;

    let classes =
      "flex h-12 w-full min-w-0 flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors";

    if (isSelected) {
      classes += " bg-primary text-primary-foreground";
    } else if (isToday) {
      classes += " bg-primary/10 text-primary ring-2 ring-inset ring-primary";
    } else if (hasMeals) {
      classes += " bg-primary/10 text-primary hover:bg-primary/15";
    } else {
      classes += " text-foreground hover:bg-muted";
    }

    return classes;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return (
    <section className="surface p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="h-4 w-4" />
          </span>
          Calendario
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => navigateMonth("prev")}
            disabled={loading}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[8rem] text-center text-sm font-medium tabular">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => navigateMonth("next")}
            disabled={loading}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cabecera de días */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
          <div key={day} className="flex h-8 items-center justify-center text-xs text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Cuadrícula */}
      <div className={cn("grid grid-cols-7 gap-1", loading && "opacity-60")}>
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="h-12" />;
          }

          const meals = getMealsForDate(date);
          const totalCalories = getTotalCaloriesForDate(date);
          const mealCount = meals.length;

          return (
            <button
              type="button"
              key={index}
              className={getDateClasses(date)}
              onClick={() => handleDateClick(date)}
              aria-label={`${date.getDate()}${mealCount > 0 ? `, ${totalCalories} kcal` : ""}`}
            >
              <span className="leading-none tabular">{date.getDate()}</span>
              {mealCount > 0 && (
                <span className="mt-1 max-w-full truncate px-0.5 text-[11px] leading-none tabular opacity-80">
                  {totalCalories}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded ring-2 ring-inset ring-primary" />
          Hoy
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-primary/15" />
          Con comidas (kcal)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-primary" />
          Seleccionado
        </span>
      </div>

      {/* Detalle del día seleccionado */}
      {selectedDate && getMealCountForDate(selectedDate) > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="mb-2 font-semibold first-letter:uppercase">
            {selectedDate.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          <ul className="space-y-1.5">
            {getMealsForDate(selectedDate).map((meal) => (
              <li key={meal.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                <Utensils className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{meal.foodName}</p>
                  <p className="text-xs text-muted-foreground tabular">
                    {meal.createdAt.toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="shrink-0 font-display text-base font-semibold tabular">
                  {meal.calories}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">kcal</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
