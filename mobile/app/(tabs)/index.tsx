import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, ScreenTitle } from "@/components/ui";
import { MealCard } from "@/components/meal-card";
import { getGreeting, formatTodayLong } from "@/lib/date-format";
import { colors, radii, spacing } from "@/lib/theme";

function MacroBar({
  label,
  consumed,
  goal,
  color,
}: {
  label: string;
  consumed: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroTrack}>
        <View
          style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={styles.macroValue}>
        {Math.round(consumed)}/{goal > 0 ? Math.round(goal) : "—"}g
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { calorieData, meals, loading } = useAppData();
  const { isPremium, available } = useSubscription();

  const recent = meals.filter((m) => !m.isPlanned).slice(0, 3);
  const consumed = calorieData?.consumed ?? 0;
  const goal = calorieData?.dailyGoal ?? 0;
  const remaining = calorieData?.remaining ?? 0;
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <ScreenTitle
          title={`${getGreeting()}${user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}`}
          subtitle={formatTodayLong()}
        />

        {available && !isPremium ? (
          <Link href="/paywall" asChild>
            <Card style={styles.premiumBanner}>
              <Ionicons name="sparkles" size={20} color={colors.premium} />
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumTitle}>Eaty Premium</Text>
                <Text style={styles.premiumSubtitle}>
                  Análisis ilimitados, dietas IA y coach personal
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.premium} />
            </Card>
          </Link>
        ) : null}

        <Card style={{ gap: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardHeading}>Calorías de hoy</Text>
            <Text style={styles.caloriesBig}>
              {Math.round(consumed)}
              <Text style={styles.caloriesGoal}>
                {" "}
                / {goal > 0 ? Math.round(goal) : "—"} kcal
              </Text>
            </Text>
          </View>
          <View style={styles.calorieTrack}>
            <View style={[styles.calorieFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.remainingText}>
            {loading
              ? "Cargando…"
              : goal > 0
                ? `Te quedan ${Math.round(remaining)} kcal`
                : "Completa tu perfil para calcular tu meta"}
          </Text>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={styles.cardHeading}>Macros</Text>
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <MacroBar
              label="Proteína"
              consumed={calorieData?.consumedMacros.protein ?? 0}
              goal={calorieData?.macros.protein ?? 0}
              color={colors.protein}
            />
            <MacroBar
              label="Carbos"
              consumed={calorieData?.consumedMacros.carbs ?? 0}
              goal={calorieData?.macros.carbs ?? 0}
              color={colors.carbs}
            />
            <MacroBar
              label="Grasa"
              consumed={calorieData?.consumedMacros.fat ?? 0}
              goal={calorieData?.macros.fat ?? 0}
              color={colors.fat}
            />
          </View>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardHeading}>Comidas recientes</Text>
            <Link href="/(tabs)/history" style={{ color: colors.primaryDark }}>
              Ver todas
            </Link>
          </View>
          {recent.length === 0 ? (
            <Card>
              <Text style={{ color: colors.textMuted, textAlign: "center" }}>
                Aún no registras comidas hoy.{"\n"}Toca «Escanear» para empezar 📸
              </Text>
            </Card>
          ) : (
            recent.map((meal) => <MealCard key={meal.id} meal={meal} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  caloriesBig: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  caloriesGoal: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },
  calorieTrack: {
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
  },
  calorieFill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  remainingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  macroLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  macroTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  macroFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  macroValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.premiumSoft,
    borderColor: colors.premium,
  },
  premiumTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.premium,
  },
  premiumSubtitle: {
    fontSize: 13,
    color: colors.text,
  },
});
