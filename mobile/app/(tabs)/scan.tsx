import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { analyzeFood, isQuotaError } from "@/lib/api";
import { saveMeal, updateMealImage } from "@/lib/meals";
import { uploadUserMealImage } from "@/lib/meal-image-storage";
import { updateUserProfile } from "@/lib/profile";
import { Button, Card, ErrorText, Field, ScreenTitle } from "@/components/ui";
import { colors, radii, spacing } from "@/lib/theme";
import type { FoodAnalysisMealFields } from "@/lib/food-analysis-schema";

type Phase = "idle" | "analyzing" | "result" | "saving";

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "Confianza alta",
  medium: "Confianza media",
  low: "Confianza baja",
};

/** Redimensiona/comprime para quedar muy por debajo del límite de Groq (~4MB base64). */
async function toAnalyzableImage(uri: string): Promise<{ base64: string; uri: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!result.base64) throw new Error("No se pudo procesar la imagen.");
  return { base64: result.base64, uri: result.uri };
}

export default function ScanScreen() {
  const { user } = useAuth();
  const { profile } = useAppData();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysisMealFields | null>(null);
  const [foodName, setFoodName] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setPhase("idle");
    setError(null);
    setImageUri(null);
    setResult(null);
    setFoodName("");
    setDescription("");
  };

  const handleAnalysisError = (e: unknown) => {
    if (isQuotaError(e)) {
      setPhase("idle");
      Alert.alert(
        "Límite de análisis alcanzado",
        "Llegaste al límite gratuito de hoy. Con Eaty Premium tienes análisis ilimitados.",
        [
          { text: "Ahora no", style: "cancel" },
          { text: "Ver Premium", onPress: () => router.push("/paywall") },
        ]
      );
      return;
    }
    setPhase("idle");
    setError(e instanceof Error ? e.message : "Error al analizar la comida.");
  };

  const analyzeImage = async (pickedUri: string) => {
    setError(null);
    setPhase("analyzing");
    try {
      const { base64, uri } = await toAnalyzableImage(pickedUri);
      setImageUri(uri);
      const fields = await analyzeFood({
        imageBase64: base64,
        imageMimeType: "image/jpeg",
        allergens: profile?.allergens,
        lang: profile?.language ?? "es",
      });
      setResult(fields);
      setPhase("result");
    } catch (e) {
      handleAnalysisError(e);
    }
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Concede permiso de cámara para escanear tu comida.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets[0]) await analyzeImage(res.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!res.canceled && res.assets[0]) await analyzeImage(res.assets[0].uri);
  };

  const analyzeText = async () => {
    if (!foodName.trim() && !description.trim()) {
      setError("Escribe el nombre o una descripción de la comida.");
      return;
    }
    setError(null);
    setPhase("analyzing");
    try {
      const fields = await analyzeFood({
        foodName: foodName.trim() || undefined,
        description: description.trim() || undefined,
        allergens: profile?.allergens,
        lang: profile?.language ?? "es",
      });
      setResult(fields);
      setPhase("result");
    } catch (e) {
      handleAnalysisError(e);
    }
  };

  const save = async () => {
    if (!user || !result) return;
    setPhase("saving");
    try {
      const mealId = await saveMeal(user.uid, {
        imageUrl: null,
        foodName: result.foodName,
        calories: result.calories,
        macros: result.macros,
        recommendations: result.recommendations,
        aiContext: result.aiContext,
        isPlanned: false,
      });
      if (imageUri) {
        // La comida ya está guardada; si la foto falla, no bloqueamos.
        try {
          const url = await uploadUserMealImage(user.uid, mealId, imageUri);
          await updateMealImage(user.uid, mealId, url);
        } catch {
          // sin foto, sin drama
        }
      }
      // Racha simple: marca actividad de hoy en el perfil.
      try {
        await updateUserProfile(user.uid, { lastActiveDate: new Date() });
      } catch {
        // no crítico
      }
      reset();
      router.push("/(tabs)");
    } catch (e) {
      setPhase("result");
      setError(e instanceof Error ? e.message : "Error al guardar la comida.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenTitle
            title="Escanear comida"
            subtitle="Foto o descripción: la IA estima calorías y macros"
          />

          {phase === "idle" && (
            <>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Card style={styles.bigAction}>
                  <Ionicons name="camera" size={32} color={colors.primary} />
                  <Text style={styles.bigActionText}>Cámara</Text>
                  <Button title="Tomar foto" onPress={pickFromCamera} style={{ alignSelf: "stretch" }} />
                </Card>
                <Card style={styles.bigAction}>
                  <Ionicons name="images" size={32} color={colors.primary} />
                  <Text style={styles.bigActionText}>Galería</Text>
                  <Button
                    title="Elegir foto"
                    variant="outline"
                    onPress={pickFromLibrary}
                    style={{ alignSelf: "stretch" }}
                  />
                </Card>
              </View>

              <Card style={{ gap: spacing.sm }}>
                <Text style={styles.sectionTitle}>O descríbela</Text>
                <Field
                  label="Nombre"
                  value={foodName}
                  onChangeText={setFoodName}
                  placeholder="Ej: arroz con pollo"
                />
                <Field
                  label="Descripción (opcional)"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Porción, ingredientes, preparación…"
                  multiline
                />
                <Button title="Analizar" onPress={analyzeText} />
              </Card>
              <ErrorText>{error}</ErrorText>
            </>
          )}

          {phase === "analyzing" && (
            <Card style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl }}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
              ) : null}
              <Text style={{ fontSize: 16, color: colors.text, fontWeight: "600" }}>
                Analizando con IA…
              </Text>
              <Text style={{ color: colors.textMuted }}>Esto toma unos segundos</Text>
            </Card>
          )}

          {(phase === "result" || phase === "saving") && result && (
            <>
              <Card style={{ gap: spacing.sm }}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
                ) : null}
                <Text style={styles.resultName}>{result.foodName}</Text>
                {result.aiContext ? (
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    {result.aiContext.dishDescription} ·{" "}
                    {CONFIDENCE_LABEL[result.aiContext.confidence] ?? ""}
                  </Text>
                ) : null}
                <Text style={styles.resultCalories}>
                  {Math.round(result.calories)} kcal
                </Text>
                <View style={styles.macroRow}>
                  <Text style={styles.macroChip}>
                    🥩 {Math.round(result.macros.protein)}g proteína
                  </Text>
                  <Text style={styles.macroChip}>
                    🌾 {Math.round(result.macros.carbs)}g carbos
                  </Text>
                  <Text style={styles.macroChip}>
                    🥑 {Math.round(result.macros.fat)}g grasa
                  </Text>
                </View>
                {result.recommendations.length > 0 && (
                  <View style={{ gap: 4 }}>
                    {result.recommendations.slice(0, 3).map((r) => (
                      <Text key={r} style={{ fontSize: 13, color: colors.textMuted }}>
                        💡 {r}
                      </Text>
                    ))}
                  </View>
                )}
              </Card>
              <ErrorText>{error}</ErrorText>
              <Button title="Guardar comida" onPress={save} loading={phase === "saving"} />
              <Button title="Descartar" variant="ghost" onPress={reset} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bigAction: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  bigActionText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  preview: {
    width: "100%",
    height: 200,
    borderRadius: radii.md,
  },
  resultName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  resultCalories: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  macroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  macroChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    color: colors.text,
    overflow: "hidden",
  },
});
