import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { PurchasesPackage } from "react-native-purchases";
import { useSubscription } from "@/hooks/use-subscription";
import { Button, Card } from "@/components/ui";
import { colors, radii, spacing } from "@/lib/theme";

const BENEFITS = [
  { icon: "infinite" as const, text: "Análisis de comida ilimitados" },
  { icon: "restaurant" as const, text: "Dietas personalizadas generadas por IA" },
  { icon: "fitness" as const, text: "Coach con insights semanales" },
  { icon: "calendar" as const, text: "Planificador semanal y reportes avanzados" },
  { icon: "flash" as const, text: "Acceso prioritario a nuevas funciones" },
];

/** Etiqueta amigable por tipo de paquete RevenueCat. */
function packageLabel(pkg: PurchasesPackage): { title: string; badge?: string } {
  switch (pkg.packageType) {
    case "ANNUAL":
      return { title: "Anual", badge: "Mejor precio" };
    case "MONTHLY":
      return { title: "Mensual" };
    case "WEEKLY":
      return { title: "Semanal" };
    case "LIFETIME":
      return { title: "De por vida" };
    default:
      return { title: pkg.product.title || pkg.identifier };
  }
}

export default function PaywallScreen() {
  const { available, isPremium, currentOffering, purchase, restore } =
    useSubscription();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const packages = currentOffering?.availablePackages ?? [];
  const selectedPkg =
    packages.find((p) => p.identifier === selected) ?? packages[0] ?? null;

  const buy = async () => {
    if (!selectedPkg) return;
    setBusy(true);
    try {
      await purchase(selectedPkg);
      Alert.alert("¡Listo! 🎉", "Ya tienes Eaty Premium. A disfrutar.", [
        { text: "Continuar", onPress: () => router.back() },
      ]);
    } catch (e) {
      // userCancelled no merece alerta.
      const cancelled =
        typeof e === "object" && e !== null && "userCancelled" in e &&
        Boolean((e as { userCancelled: unknown }).userCancelled);
      if (!cancelled) {
        Alert.alert(
          "No se pudo completar la compra",
          e instanceof Error ? e.message : "Inténtalo de nuevo."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      await restore();
      Alert.alert("Compras restauradas", "Si tenías Premium, ya está activo.");
    } catch {
      Alert.alert("Error", "No se pudieron restaurar las compras.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>

        <View style={{ alignItems: "center", gap: spacing.xs }}>
          <Text style={{ fontSize: 40 }}>✨</Text>
          <Text style={styles.title}>Eaty Premium</Text>
          <Text style={styles.subtitle}>
            Saca el máximo a tu nutrición con IA sin límites
          </Text>
        </View>

        <Card style={{ gap: spacing.sm }}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefitRow}>
              <Ionicons name={b.icon} size={20} color={colors.premium} />
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </Card>

        {isPremium ? (
          <Card style={{ alignItems: "center", gap: spacing.xs }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.premium }}>
              Ya tienes Premium activo 💜
            </Text>
            <Button title="Volver" variant="outline" onPress={() => router.back()} />
          </Card>
        ) : !available ? (
          <Card style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textMuted, textAlign: "center" }}>
              Las compras no están disponibles en esta versión de la app
              (Expo Go o stores sin configurar). Compila con EAS y configura
              RevenueCat para activarlas.
            </Text>
          </Card>
        ) : packages.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textMuted, textAlign: "center" }}>
              Cargando planes… Si esto persiste, revisa los productos del
              offering «default» en RevenueCat.
            </Text>
          </Card>
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              {packages.map((pkg) => {
                const { title, badge } = packageLabel(pkg);
                const active = selectedPkg?.identifier === pkg.identifier;
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => setSelected(pkg.identifier)}
                  >
                    <Card style={[styles.planCard, active && styles.planCardActive]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planTitle}>{title}</Text>
                        <Text style={styles.planPrice}>
                          {pkg.product.priceString}
                          {pkg.packageType === "ANNUAL" ? " / año" : ""}
                          {pkg.packageType === "MONTHLY" ? " / mes" : ""}
                        </Text>
                      </View>
                      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={22}
                        color={active ? colors.premium : colors.textMuted}
                      />
                    </Card>
                  </Pressable>
                );
              })}
            </View>

            <Button
              title="Suscribirme"
              variant="premium"
              onPress={buy}
              loading={busy}
              disabled={!selectedPkg}
            />
            <Button title="Restaurar compras" variant="ghost" onPress={doRestore} />
            <Text style={styles.legal}>
              La suscripción se renueva automáticamente y se gestiona desde tu
              cuenta de App Store / Google Play. Puedes cancelarla en cualquier
              momento.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  close: {
    alignSelf: "flex-end",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  planCardActive: {
    borderColor: colors.premium,
    backgroundColor: colors.premiumSoft,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  planPrice: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badge: {
    backgroundColor: colors.premium,
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  legal: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
});
