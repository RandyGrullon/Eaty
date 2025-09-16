"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Eye } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getUserMeals } from "@/lib/meals"
import type { Meal } from "@/types/meal"
import { MealDetailModal } from "./meal-detail-modal"

interface MealHistoryProps {
  onBack: () => void
}

export function MealHistory({ onBack }: MealHistoryProps) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadMeals()
    }
  }, [user])

  const loadMeals = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const userMeals = await getUserMeals(user.uid)
      setMeals(userMeals)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return `Hoy, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer, ${date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
    } else {
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  const getCaloriesBadgeColor = (calories: number) => {
    if (calories < 200) return "bg-green-100 text-green-800"
    if (calories < 400) return "bg-yellow-100 text-yellow-800"
    if (calories < 600) return "bg-orange-100 text-orange-800"
    return "bg-red-100 text-red-800"
  }

  const groupMealsByDate = (meals: Meal[]) => {
    const groups: { [key: string]: Meal[] } = {}

    meals.forEach((meal) => {
      const dateKey = meal.createdAt.toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(meal)
    })

    return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary text-primary-foreground p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Historial</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary text-primary-foreground p-4">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Historial</h1>
          </div>
        </div>
        <div className="p-4 max-w-md mx-auto text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadMeals} variant="outline">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const groupedMeals = groupMealsByDate(meals)

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Historial</h1>
            <p className="text-sm opacity-90">{meals.length} comidas analizadas</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-md mx-auto">
        {meals.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Sin comidas registradas</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Comienza a escanear tus comidas para ver tu historial nutricional aquí
            </p>
            <Button onClick={onBack} className="w-full">
              Escanear Primera Comida
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <Card className="bg-secondary/10 border-secondary/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-secondary">{meals.length}</div>
                    <div className="text-xs text-muted-foreground">Total comidas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary">
                      {Math.round(meals.reduce((sum, meal) => sum + meal.calories, 0) / meals.length)}
                    </div>
                    <div className="text-xs text-muted-foreground">Cal promedio</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-secondary">
                      {meals.reduce((sum, meal) => sum + meal.calories, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Cal totales</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Grouped Meals */}
            {groupedMeals.map(([dateString, dayMeals]) => {
              const date = new Date(dateString)
              const dayCalories = dayMeals.reduce((sum, meal) => sum + meal.calories, 0)

              return (
                <div key={dateString} className="space-y-3">
                  {/* Date Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">
                      {date.toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {dayCalories} cal
                    </Badge>
                  </div>

                  {/* Meals for this date */}
                  <div className="space-y-2">
                    {dayMeals.map((meal) => (
                      <Card key={meal.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            {/* Meal Image */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {meal.imageUrl ? (
                                <img
                                  src={meal.imageUrl || "/placeholder.svg"}
                                  alt={meal.foodName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Calendar className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* Meal Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground truncate">{meal.foodName}</h4>
                              <p className="text-sm text-muted-foreground">{formatDate(meal.createdAt)}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`text-xs ${getCaloriesBadgeColor(meal.calories)}`}>
                                  {meal.calories} cal
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  P: {meal.macros.protein}g • C: {meal.macros.carbs}g • G: {meal.macros.fat}g
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMeal(meal)}
                              className="flex-shrink-0 p-2"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Meal Detail Modal */}
      {selectedMeal && (
        <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} onDelete={loadMeals} />
      )}
    </div>
  )
}
