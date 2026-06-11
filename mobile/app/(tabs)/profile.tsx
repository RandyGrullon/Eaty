import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { useSubscription } from "@/hooks/use-subscription";
import { updateUserProfile } from "@/lib/profile";
import { getProfileDisplayAge } from "@/lib/age-from-birthdate";
import { Button, Card, ErrorText, Field, ScreenTitle } from "@/components/ui";
import { colors, radii, spacing } from "@/lib/theme";
import type { UserProfile } from "@/types/meal";

const ACTIVITY_OPTIONS: Array<{ value: NonNullable<UserProfile["activityLevel"]>; label: string }> = [
  { value: "sedentary", label: "Sedentario" },
  { value: "light", label: "Ligero" },
  { value: "moderate", label: "Moderado" },
  { value: "active", label: "Activo" },
  { value: "very_active", label: "Muy activo" },
];

const GOAL_OPTIONS: Array<{ value: NonNullable<UserProfile["fitnessGoal"]>; label: string }> = [
  { value: "shedding", label: "Perder grasa" },
  { value: "maintenance", label: "Mantener" },
  { value: "bulking", label: "Ganar músculo" },
];

const GENDER_OPTIONS: Array<{ value: NonNullable<UserProfile["gender"]>; label: string }> = [
  { value: "male", label: "Hombre" },
  { value: "female", label: "Mujer" },
  { value: "other", label: "Otro" },
];

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Text
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            {opt.label}
          </Text>
        );
      })}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, calorieData } = useAppData();
  const { isPremium, available } = useSubscription();

  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<UserProfile["gender"]>();
  const [activity, setActivity] = useState<UserProfile["activityLevel"]>();
  const [goal, setGoal] = useState<UserProfile["fitnessGoal"]>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const displayAge = getProfileDisplayAge(profile);
    setAge(displayAge != null ? String(displayAge) : "");
    setWeight(typeof profile.weight === "number" ? String(profile.weight) : "");
    setHeight(typeof profile.height === "number" ? String(profile.height) : "");
    setGender(profile.gender);
    setActivity(profile.activityLevel);
    setGoal(profile.fitnessGoal);
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setError(null);
    setSaved(false);
    const ageN = parseInt(age, 10);
    const weightN = parseFloat(weight);
    const heightN = parseFloat(height);
    if (!Number.isFinite(ageN) || ageN < 10 || ageN > 120) {
      setError("Edad inválida.");
      return;
    }
    if (!Number.isFinite(weightN) || weightN <= 0 || !Number.isFinite(heightN) || heightN <= 0) {
      setError("Peso y altura deben ser números válidos (kg y cm).");
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        age: ageN,
        weight: weightN,
        height: heightN,
        gender,
        activityLevel: activity,
        fitnessGoal: goal,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: () => void signOut() },
    ]);
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
            title="Perfil"
            subtitle={user?.email ?? undefined}
          />

          {available ? (
            <Card style={[styles.subCard, isPremium && { borderColor: colors.premium }]}>
              <Ionicons
                name={isPremium ? "sparkles" : "lock-closed"}
                size={20}
                color={colors.premium}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.subTitle}>
                  {isPremium ? "Eaty Premium activo" : "Plan gratuito"}
                </Text>
                <Text style={styles.subSubtitle}>
                  {isPremium
                    ? "Gracias por apoyar Eaty 💚"
                    : "Análisis ilimitados, dietas IA y más"}
                </Text>
              </View>
              {!isPremium && (
                <Link href="/paywall" style={{ color: colors.premium, fontWeight: "700" }}>
                  Mejorar
                </Link>
              )}
            </Card>
          ) : null}

          {calorieData && calorieData.tdee > 0 ? (
            <Card style={{ gap: 4 }}>
              <Text style={styles.cardHeading}>Tu meta diaria</Text>
              <Text style={styles.tdeeBig}>{calorieData.dailyGoal} kcal</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>
                {calorieData.explanation}
              </Text>
            </Card>
          ) : null}

          <Card style={{ gap: spacing.sm }}>
            <Text style={styles.cardHeading}>Datos para tu meta</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Edad"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  placeholder="28"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Peso (kg)"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="75"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Altura (cm)"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="decimal-pad"
                  placeholder="175"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Sexo</Text>
            <Chips options={GENDER_OPTIONS} value={gender} onChange={setGender} />
            <Text style={styles.fieldLabel}>Actividad</Text>
            <Chips options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
            <Text style={styles.fieldLabel}>Objetivo</Text>
            <Chips options={GOAL_OPTIONS} value={goal} onChange={setGoal} />

            <ErrorText>{error}</ErrorText>
            {saved ? (
              <Text style={{ color: colors.primaryDark }}>Perfil guardado ✓</Text>
            ) : null}
            <Button title="Guardar perfil" onPress={save} loading={saving} />
          </Card>

          <Button title="Cerrar sesión" variant="ghost" onPress={confirmSignOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cardHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  tdeeBig: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  subCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  subSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
