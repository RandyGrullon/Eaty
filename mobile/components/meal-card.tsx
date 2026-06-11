import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Card } from "@/components/ui";
import { formatMealDate } from "@/lib/date-format";
import { colors, radii, spacing } from "@/lib/theme";
import type { Meal } from "@/types/meal";

export function MealCard({ meal }: { meal: Meal }) {
  return (
    <Card style={styles.row}>
      {meal.imageUrl ? (
        <Image source={{ uri: meal.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={{ fontSize: 22 }}>🍽️</Text>
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.name} numberOfLines={1}>
          {meal.foodName || "Comida"}
        </Text>
        <Text style={styles.date}>{formatMealDate(meal.createdAt)}</Text>
        <Text style={styles.macros}>
          P {Math.round(meal.macros.protein)}g · C {Math.round(meal.macros.carbs)}g · G{" "}
          {Math.round(meal.macros.fat)}g
        </Text>
      </View>
      <Text style={styles.calories}>{Math.round(meal.calories)} kcal</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
  },
  thumbPlaceholder: {
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  macros: {
    fontSize: 12,
    color: colors.textMuted,
  },
  calories: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryDark,
  },
});
