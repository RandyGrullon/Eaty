import { useMemo } from "react";
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { useAppData } from "@/hooks/use-app-data";
import { deleteMeal } from "@/lib/meals";
import { MealCard } from "@/components/meal-card";
import { ScreenTitle } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import type { Meal } from "@/types/meal";

function sectionTitle(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const { meals, loading } = useAppData();

  const sections = useMemo(() => {
    const groups = new Map<string, { title: string; data: Meal[]; kcal: number }>();
    for (const meal of meals) {
      if (meal.isPlanned) continue;
      const key = meal.createdAt.toDateString();
      if (!groups.has(key)) {
        groups.set(key, { title: sectionTitle(meal.createdAt), data: [], kcal: 0 });
      }
      const g = groups.get(key)!;
      g.data.push(meal);
      g.kcal += meal.calories || 0;
    }
    return [...groups.values()];
  }, [meals]);

  const confirmDelete = (meal: Meal) => {
    if (!user) return;
    Alert.alert("Eliminar comida", `¿Eliminar «${meal.foodName}»?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          deleteMeal(user.uid, meal.id).catch(() =>
            Alert.alert("Error", "No se pudo eliminar la comida.")
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <ScreenTitle title="Historial" subtitle="Últimos 90 días" />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionKcal}>{Math.round(section.kcal)} kcal</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => confirmDelete(item)}>
            <MealCard meal={item} />
          </Pressable>
        )}
        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? "Cargando…" : "Sin comidas registradas aún. ¡Escanea tu primera!"}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    backgroundColor: colors.background,
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textTransform: "capitalize",
  },
  sectionKcal: {
    fontSize: 13,
    color: colors.textMuted,
  },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
