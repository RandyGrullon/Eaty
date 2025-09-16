"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Trash2, Calendar } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Meal } from "@/types/meal"

interface MealDetailModalProps {
  meal: Meal
  onClose: () => void
  onDelete: () => void
}

export function MealDetailModal({ meal, onClose, onDelete }: MealDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { user } = useAuth()

  const macroData = [
    { name: "Proteínas", value: meal.macros.protein, color: "bg-blue-500", unit: "g" },
    { name: "Carbohidratos", value: meal.macros.carbs, color: "bg-orange-500", unit: "g" },
    { name: "Grasas", value: meal.macros.fat, color: "bg-red-500", unit: "g" },
    { name: "Fibra", value: meal.macros.fiber, color: "bg-green-500", unit: "g" },
    { name: "Azúcar", value: meal.macros.sugar, color: "bg-purple-500", unit: "g" },
  ]

  const totalMacros = meal.macros.protein + meal.macros.carbs + meal.macros.fat

  const handleDelete = async () => {
    if (!user || !confirm("¿Estás seguro de que quieres eliminar esta comida?")) return

    setIsDeleting(true)

    try {
      await deleteDoc(doc(db, "users", user.uid, "meals", meal.id))
      onDelete()
      onClose()
    } catch (error) {
      console.error("Error deleting meal:", error)
      alert("Error al eliminar la comida")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-foreground">Detalle de Comida</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:bg-destructive/10 p-2"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Food Image and Basic Info */}
          <Card>
            <CardContent className="p-4 text-center">
              {meal.imageUrl && (
                <div className="w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={meal.imageUrl || "/placeholder.svg"}
                    alt={meal.foodName}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="text-xl font-bold text-foreground mb-2">{meal.foodName}</h3>
              <div className="text-3xl font-bold text-primary mb-1">{meal.calories}</div>
              <div className="text-sm text-muted-foreground mb-3">calorías por porción</div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(meal.createdAt)}
              </div>
            </CardContent>
          </Card>

          {/* Macronutrients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Macronutrientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {macroData.map((macro) => {
                const percentage = totalMacros > 0 ? (macro.value / totalMacros) * 100 : 0

                return (
                  <div key={macro.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{macro.name}</span>
                      <span className="text-sm font-bold">
                        {macro.value}
                        {macro.unit}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${macro.color}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">{percentage.toFixed(1)}%</div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recomendaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meal.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Badge variant="secondary" className="mt-0.5 text-xs">
                    {index + 1}
                  </Badge>
                  <p className="text-sm text-foreground leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Nutritional Summary */}
          <Card className="bg-accent/5 border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg text-accent">Resumen Nutricional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg">{(meal.calories / 4).toFixed(0)}</div>
                  <div className="text-muted-foreground">Cal/gramo aprox.</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg">{totalMacros.toFixed(1)}g</div>
                  <div className="text-muted-foreground">Macros totales</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
