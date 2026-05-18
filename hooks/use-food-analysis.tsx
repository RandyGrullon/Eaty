"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeFood } from "@/lib/groq";
import { userMessageForGroqError } from "@/lib/groq-api-error";
import { logger } from "@/lib/logger";
import { prepareImageForGroq } from "@/lib/image-for-llm";
import { saveMeal, updateStreak, awardPoints } from "@/lib/meals";
import { saveMealOffline } from "@/lib/offline-storage";
import { useAuth } from "./use-auth";
import { useUserProfile } from "./use-user-profile";
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

export function useFoodAnalysis(onSaveSuccess?: () => void) {
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
  const { userProfile } = useUserProfile();

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
            allergens: userProfile?.allergens,
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
    [user, toast, userProfile?.allergens]
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
          { 
            foodName: foodName.trim(),
            allergens: userProfile?.allergens,
          },
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
    [user, toast, userProfile?.allergens]
  );

  // Si deja de haber resultado, no dejar "Guardando" (p. ej. cierre o fallback)
  useEffect(() => {
    if (analysisResult === null) {
      setIsSaving(false);
      saveInFlightRef.current = false;
    }
  }, [analysisResult]);

  const saveAnalysis = useCallback(async (editedData?: AnalysisState): Promise<void> => {
    const dataToSave = editedData || analysisResult;
    if (!dataToSave || !user) return;
    if (saveInFlightRef.current) return;

    saveInFlightRef.current = true;
    setIsSaving(true);

    const imageFileForStorage = lastAnalyzedImageFileRef.current;

    // Verificar si estamos online
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        await saveMealOffline(user.uid, dataToSave, imageFileForStorage ?? undefined);
        toast({
          title: "Guardado offline",
          description: "La comida se guardó localmente y se sincronizará cuando vuelvas a tener conexión.",
        });
        setAnalysisResult(null);
        revokeImagePreview(imagePreviewObjectUrl, setImagePreviewUrl);
        setImageAnalysisError(null);
        lastImageRetryRef.current = null;
        lastAnalyzedImageFileRef.current = null;
        if (onSaveSuccess) onSaveSuccess();
        return;
      } catch (err) {
        logger.error("saveAnalysis offline", err);
        toast({
          title: "Error al guardar offline",
          description: "No se pudo guardar la comida localmente.",
          variant: "destructive",
        });
        return;
      } finally {
        saveInFlightRef.current = false;
        setIsSaving(false);
      }
    }

    try {
      const { imageStored } = await saveMeal(user.uid, dataToSave, {
        imageFile: imageFileForStorage ?? undefined,
      });

      // Actualizar racha después de guardar con éxito
      void updateStreak(user.uid).catch((e) =>
        logger.error("Error updating streak", e)
      );

      // Otorga puntos (ej: 50 por comida)
      void awardPoints(user.uid, 50).then(({ leveledUp }) => {
        if (leveledUp) {
          toast({
            title: "¡Subida de nivel!",
            description: "Has alcanzado un nuevo nivel. ¡Sigue así!",
          });
        }
      }).catch((e) => logger.error("Error awarding points", e));

      if (onSaveSuccess) onSaveSuccess();

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
  }, [analysisResult, user, toast, onSaveSuccess]);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setImageAnalysisError(null);
    lastImageRetryRef.current = null;
    lastAnalyzedImageFileRef.current = null;
    saveInFlightRef.current = false;
    setIsSaving(false);
    revokeImagePreview(imagePreviewObjectUrl, setImagePreviewUrl);
  }, []);

  const setManualAnalysis = useCallback((data: AnalysisState) => {
    setAnalysisResult(data);
    setImageAnalysisError(null);
    setIsAnalyzing(false);
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
    setManualAnalysis,
  };
}
