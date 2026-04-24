"use client";

import { useState } from "react";
import { analyzeFood } from "@/lib/groq";
import { userMessageForGroqError } from "@/lib/groq-api-error";
import { logger } from "@/lib/logger";
import { prepareImageForGroq } from "@/lib/image-for-llm";
import { saveMeal } from "@/lib/meals";
import { useAuth } from "./use-auth";
import type { Meal } from "@/types/meal";

export function useFoodAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Omit<
    Meal,
    "id" | "createdAt"
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  const analyzeImage = async (
    imageFile: File,
    description?: string
  ): Promise<void> => {
    if (!imageFile) return;
    if (!user) {
      setError("Debes iniciar sesión para analizar.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const idToken = await user.getIdToken(true);
      const { base64WithoutPrefix, mimeType } =
        await prepareImageForGroq(imageFile);

      const result = await analyzeFood(
        {
          imageBase64: base64WithoutPrefix,
          imageMimeType: mimeType,
          description,
        },
        idToken
      );

      setAnalysisResult({
        imageUrl: null,
        foodName: result.foodName,
        calories: result.calories,
        macros: result.macros,
        recommendations: result.recommendations,
      });
    } catch (err: unknown) {
      logger.error("analyzeImage", err);
      setError(userMessageForGroqError(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeText = async (foodName: string): Promise<void> => {
    if (!foodName.trim()) return;
    if (!user) {
      setError("Debes iniciar sesión para analizar.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const idToken = await user.getIdToken(true);
      const result = await analyzeFood(
        { foodName: foodName.trim() },
        idToken
      );

      setAnalysisResult({
        imageUrl: null,
        foodName: result.foodName || foodName,
        calories: result.calories,
        macros: result.macros,
        recommendations: result.recommendations,
      });
    } catch (err: unknown) {
      logger.error("analyzeText", err);
      setError(userMessageForGroqError(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysis = async (): Promise<void> => {
    if (!analysisResult || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      await saveMeal(user.uid, analysisResult);
      setAnalysisResult(null);
    } catch (err: unknown) {
      logger.error("saveAnalysis", err);
      setError("Error al guardar la comida. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setError(null);
  };

  return {
    isAnalyzing,
    isSaving,
    analysisResult,
    error,
    analyzeImage,
    analyzeText,
    saveAnalysis,
    clearAnalysis,
  };
}
