"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Share2 } from "lucide-react"
import type { Meal } from "@/types/meal"

interface AnalysisResultsProps {
  result: Omit<Meal, "id" | "createdAt">
  onBack: () => void
  onSave: () => void
  isSaving?: boolean
}

export function AnalysisResults({ result, onBack, onSave, isSaving = false }: AnalysisResultsProps) {
  const macroData = [
    { name: "Proteínas", value: result.macros.protein, color: "bg-blue-500", unit: "g" },
    { name: "Carbohidratos", value: result.macros.carbs, color: "bg-orange-500", unit: "g" },
    { name: "Grasas", value: result.macros.fat, color: "bg-red-500", unit: "g" },
    { name: "Fibra", value: result.macros.fiber, color: "bg-green-500", unit: "g" },
    { name: "Azúcar", value: result.macros.sugar, color: "bg-purple-500", unit: "g" },
  ]

  const totalMacros = result.macros.protein + result.macros.carbs + result.macros.fat

  return (
    <div className="min-h-screen bg-background">
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
            <h1 className="text-lg font-bold">Análisis Nutricional</h1>
          </div>
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/20 p-2">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-md mx-auto space-y-6 pb-20">
        {/* Food Image and Name */}
        <Card>
          <CardContent className="p-6 text-center">
            {result.imageUrl && (
              <div className="w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden bg-muted">
                <img
                  src={result.imageUrl || "/placeholder.svg"}
                  alt={result.foodName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h2 className="text-xl font-bold text-card-foreground mb-2">{result.foodName}</h2>
            <div className="text-3xl font-bold text-primary">{result.calories}</div>
            <div className="text-sm text-muted-foreground">calorías por porción</div>
          </CardContent>
        </Card>

        {/* Macronutrients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Macronutrientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            {result.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-0.5 text-xs">
                  {index + 1}
                </Badge>
                <p className="text-sm text-card-foreground leading-relaxed">{recommendation}</p>
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
                <div className="font-bold text-lg">{(result.calories / 4).toFixed(0)}</div>
                <div className="text-muted-foreground">Cal/gramo aprox.</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{totalMacros.toFixed(1)}g</div>
                <div className="text-muted-foreground">Macros totales</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="sticky bottom-4">
          <Button onClick={onSave} disabled={isSaving} className="w-full h-12 text-lg font-semibold">
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Guardar en mi Historial
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
