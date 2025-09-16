"use client"

import { useState } from "react"
import { analyzeFood } from "@/lib/gemini"
import { saveMeal } from "@/lib/meals"
import { useAuth } from "./use-auth"
import type { Meal } from "@/types/meal"

export function useFoodAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<Omit<Meal, "id" | "createdAt"> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuth()

  const analyzeImage = async (imageFile: File): Promise<void> => {
    if (!imageFile) return

    setIsAnalyzing(true)
    setError(null)

    try {
      // Convert image to base64
      const base64 = await fileToBase64(imageFile)
      const base64Data = base64.split(",")[1] // Remove data:image/jpeg;base64, prefix

      // Create image URL for display
      const imageUrl = URL.createObjectURL(imageFile)

      // Analyze with Gemini
      const result = await analyzeFood(base64Data)

      setAnalysisResult({
        imageUrl,
        foodName: result.foodName,
        calories: result.calories,
        macros: result.macros,
        recommendations: result.recommendations,
      })
    } catch (error: any) {
      console.error("Error analyzing image:", error)
      setError("Error al analizar la imagen. Intenta nuevamente.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeText = async (foodName: string): Promise<void> => {
    if (!foodName.trim()) return

    setIsAnalyzing(true)
    setError(null)

    try {
      // Analyze with Gemini using text only
      const result = await analyzeFood(undefined, foodName)

      setAnalysisResult({
        imageUrl: null,
        foodName: result.foodName || foodName,
        calories: result.calories,
        macros: result.macros,
        recommendations: result.recommendations,
      })
    } catch (error: any) {
      console.error("Error analyzing text:", error)
      setError("Error al analizar la comida. Intenta nuevamente.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveAnalysis = async (): Promise<void> => {
    if (!analysisResult || !user) return

    setIsSaving(true)
    setError(null)

    try {
      await saveMeal(user.uid, analysisResult)
      // Clear the analysis result after saving
      setAnalysisResult(null)
    } catch (error: any) {
      console.error("Error saving meal:", error)
      setError("Error al guardar la comida. Intenta nuevamente.")
    } finally {
      setIsSaving(false)
    }
  }

  const clearAnalysis = () => {
    setAnalysisResult(null)
    setError(null)
  }

  return {
    isAnalyzing,
    isSaving,
    analysisResult,
    error,
    analyzeImage,
    analyzeText,
    saveAnalysis,
    clearAnalysis,
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}
