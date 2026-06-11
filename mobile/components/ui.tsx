import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@/lib/theme";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "premium" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && { backgroundColor: colors.primary },
        variant === "premium" && { backgroundColor: colors.premium },
        variant === "outline" && styles.buttonOutline,
        variant === "ghost" && { backgroundColor: "transparent" },
        pressed && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" || variant === "ghost" ? colors.primary : "#fff"}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            (variant === "outline" || variant === "ghost") && {
              color: variant === "ghost" ? colors.textMuted : colors.primary,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function GoogleButton({
  onPress,
  loading,
  title = "Continuar con Google",
}: {
  onPress: () => void;
  loading?: boolean;
  title?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        styles.buttonGoogle,
        pressed && { opacity: 0.85 },
        loading && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
        >
          <Ionicons name="logo-google" size={18} color={colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Separador "o" entre el formulario de correo y los logins sociales. */
export function OrDivider() {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
    >
      <View style={styles.dividerLine} />
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>o</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...inputProps}
        style={[styles.input, inputProps.style]}
      />
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export function ScreenTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  button: {
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: "transparent",
  },
  buttonGoogle: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
