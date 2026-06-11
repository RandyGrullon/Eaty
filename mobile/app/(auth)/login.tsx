import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { Button, ErrorText, Field, GoogleButton, OrDivider } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      // El guard del layout raíz redirige solo al estar autenticado.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión.");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setBusyGoogle(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar con Google.");
    } finally {
      setBusyGoogle(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: spacing.lg,
            gap: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
            <Text style={{ fontSize: 40 }}>🥗</Text>
            <Text style={{ fontSize: 32, fontWeight: "800", color: colors.text }}>
              Eaty
            </Text>
            <Text style={{ fontSize: 15, color: colors.textMuted }}>
              Tu nutrición, analizada con IA
            </Text>
          </View>

          <Field
            label="Correo"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="tu@correo.com"
          />
          <Field
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="••••••••"
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Iniciar sesión" onPress={onSubmit} loading={busy} />

          <OrDivider />
          <GoogleButton onPress={onGoogle} loading={busyGoogle} />

          <Link
            href="/(auth)/register"
            style={{
              textAlign: "center",
              color: colors.primaryDark,
              fontSize: 15,
              paddingVertical: spacing.sm,
            }}
          >
            ¿No tienes cuenta? Regístrate
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
