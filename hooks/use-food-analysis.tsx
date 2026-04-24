"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeFood } from "@/lib/groq";
import { userMessageForGroqError } from "@/lib/groq-api-error";
import { logger } from "@/lib/logger";
import { prepareImageForGroq } from "@/lib/image-for-llm";
import { saveMeal } from "@/lib/meals";
import { useAuth } from "./use-auth";
import { useToast } from "@/hooks/use-toast";
import type { Meal } from "@/types/meal";

type AnalysisState = Omit<Meal, "id" | "createdAt">;

function revokeImagePreview(
  ref: { current: string | null },
  setUrl: (v: string | null) => void
) {
  if (ref.current) {
    URL.revokeObjectURL(ref.current);
    ref.current = null;
  }
  setUrl(null);
}

export function useFoodAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisState | null>(
    null
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageAnalysisError, setImageAnalysisError] = useState<string | null>(
    null
  );
  const imagePreviewObjectUrl = useRef<string | null>(null);
  const lastImageRetryRef = useRef<{
    file: File;
    description?: string;
  } | null>(null);
  /** Foto del último análisis por imagen (para subir a Storage al guardar). */
  const lastAnalyzedImageFileRef = useRef<File | null>(null);
  const saveInFlightRef = useRef(false);
  const { toast } = useToast();

  const { user } = useAuth();

  useEffect(() => {
    return () => {
      if (imagePreviewObjectUrl.current) {
        URL.revokeObjectURL(imagePreviewObjectUrl.current);
        imagePreviewObjectUrl.current = null;
      }
    };
  }, []);

  const dismissImageAnalysisError = useCallback(() => {
    setImageAnalysisError(null);
    lastImageRetryRef.current = null;
    lastAnalyzedImageFileRef.current = null;
    saveInFlightRef.current = false;
    setIsSaving(false);
    revokeImagePreview(imagePreviewObjectUrl, setImagePreviewUrl);
  }, []);

  const analyzeImage = useCallback(
    async (imageFile: File, description?: string): Promise<void> => {
      if (!imageFile) return;
      if (!user) {
        toast({
          title: "Inicio de sesión requerido",
          description: "Inicia sesión para analizar comida.",
          variant: "destructive",
        });
        return;
      }

      setImageAnalysisError(null);
      lastImageRetryRef.current = null;
      lastAnalyzedImageFileRef.current = imageFile;
      setIsAnalyzing(true);
      revokeImagePreview(imagePreviewObjectUrl, setImagePreviewUrl);
      const preview = URL.createObjectURL(imageFile);
      imagePreviewObjectUrl.current = preview;
      setImagePreviewUrl(preview);

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
          ...(result.aiContext != null ? { aiContext: result.aiContext } : {}),
        });
        toast({
          title: "Análisis listo",
          description: result.foodName,
        });
      } catch (err: unknown) {
        logger.error("analyzeImage", err);
        const msg = userMessageForGroqError(err);
        lastImageRetryRef.current = { file: imageFile, description };
        setImageAnalysisError(msg);
        lastAnalyzedImageFileRef.current = null;
        toast({
          title: "No se pudo analizar",
          description: msg,
          variant: "destructive",
        });
        // Conservar la vista previa para Reintentar
      } finally {
        setIsAnalyzing(false);
      }
    },
    [user, toast]
  );

  const retryImageAnalysis = useCallback(async () => {
    const ctx = lastImageRetryRef.current;
    if (!ctx) return;
    await analyzeImage(ctx.file, ctx.description);
  }, [analyzeImage]);

  const analyzeText = useCallback(
    async (foodName: string): Promise<void> => {
      if (!foodName.trim()) return;
      if (!user) {
        toast({
          title: "Inicio de sesión requerido",
          description: "Inicia sesión para analizar comida.",
          variant: "destructive",
        });
        return;
      }

      setIsAnalyzing(true);
      revokeImagePreview(imagePreviewObjectUrl, setImagePreviewUrl);
      setImageAnalysisError(null);
      lastImageRetryRef.current = null;
      lastAnalyzedImageFileRef.current = null;

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
          ...(result.aiContext != null ? { aiContext: result.aiContext } : {}),
        });
        toast({
          title: "Análisis listo",
          description: result.foodName || foodName,
        });
      } catch (err: unknown) {
        logger.error("analyzeText", err);
        toast({
          title: "No se pudo analizar",
          description: userMessageForGroqError(err),
          variant: "destructive",
        });
      } finally {
        setIsAnalyzing(false);
      }
    },
    [user, toast]
  );

  // Si deja de haber resultado, no dejar "Guardando" (p. ej. cierre o fallback)
  useEffect(() => {
    if (analysisResult === null) {
      setIsSaving(false);
      saveInFlightRef.current = false;
    }
  }, [analysisResult]);

  const saveAnalysis = useCallback(async (): Promise<void> => {
    if (!analysisResult || !user) return;
    if (saveInFlightRef.current) return;

    saveInFlightRef.current = true;
    setIsSaving(true);

    const imageFileForStorage = lastAnalyzedImageFileRef.current;
    try {
      const { imageStored } = await saveMeal(user.uid, analysisResult, {
        imageFile: imageFileForStorage ?? undefined,
      });
      setAnalysisResult(null);
      revokeImagePreview(imagePreviewObjectUrl, setImagePreviewUrl);
      setImageAnalysisError(null);
      lastImageRetryRef.current = null;
      lastAnalyzedImageFileRef.current = null;
      toast({
        title: "Guardada en el historial",
        description: "La comida se añadió a tu registro.",
      });
      if (imageFileForStorage && !imageStored) {
        toast({
          title: "Foto no guardada en la nube",
          description:
            "Revisa Firebase Storage (reglas: lectura/escritura en users/{uid}/meals/…).",
          variant: "destructive",
        });
      }
    } catch (err: unknown) {
      logger.error("saveAnalysis", err);
      toast({
        title: "No se pudo guardar",
        description: "Revisa la conexión e inténtalo otra vez.",
        variant: "destructive",
      });
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  }, [analysisResult, user, toast]);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setImageAnalysisError(null);
    lastImageRetryRef.current = null;
    lastAnalyzedImageFileRef.current = null;
    saveInFlightRef.current = false;
    setIsSaving(false);
    revokeImagePreview(imagePreviewObjectUrl, setImagePreviewUrl);
  }, []);

  return {
    isAnalyzing,
    isSaving,
    analysisResult,
    imagePreviewUrl,
    imageAnalysisError,
    analyzeImage,
    analyzeText,
    retryImageAnalysis,
    dismissImageAnalysisError,
    saveAnalysis,
    clearAnalysis,
  };
}
