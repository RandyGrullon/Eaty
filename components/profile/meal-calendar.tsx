"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, Utensils } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getMealsGroupedByDate } from "@/lib/meals";
import type { Meal } from "@/types/meal";

interface MealCalendarProps {
  onDateSelect?: (date: Date, meals: Meal[]) => void;
}

export function MealCalendar({ onDateSelect }: MealCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mealsByDate, setMealsByDate] = useState<{ [key: string]: Meal[] }>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadMealsForMonth();
    }
  }, [user, currentDate]);

  const loadMealsForMonth = async () => {
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
  };

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
      "h-12 w-12 rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-colors hover:bg-primary/10 cursor-pointer";

    if (isSelected) {
      classes += " bg-primary text-primary-foreground";
    } else if (isToday) {
      classes += " bg-primary/20 text-primary border-2 border-primary";
    } else if (hasMeals) {
      classes += " bg-green-50 text-green-700 border border-green-200";
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendario de Comidas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("prev")}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("next")}
              disabled={loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-12" />;
            }

            const meals = getMealsForDate(date);
            const totalCalories = getTotalCaloriesForDate(date);
            const mealCount = meals.length;

            return (
              <div
                key={index}
                className={getDateClasses(date)}
                onClick={() => handleDateClick(date)}
              >
                <span className="text-xs">{date.getDate()}</span>
                {mealCount > 0 && (
                  <div className="flex flex-col items-center mt-1">
                    <Utensils className="h-3 w-3" />
                    <span className="text-xs font-bold">{totalCalories}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary/20 border-2 border-primary rounded"></div>
            <span className="text-xs text-muted-foreground">Hoy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
            <span className="text-xs text-muted-foreground">Con comidas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span className="text-xs text-muted-foreground">Seleccionado</span>
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && getMealCountForDate(selectedDate) > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium mb-2">
              Comidas del{" "}
              {selectedDate.toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h4>
            <div className="space-y-2">
              {getMealsForDate(selectedDate).map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">
                      {meal.foodName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {meal.createdAt.toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {meal.calories} cal
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
