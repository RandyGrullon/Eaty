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

export default function RegisterScreen() {
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await signUp(email, password, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la cuenta.");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setBusyGoogle(true);
    try {
      // Con Google no hay paso extra: crea la cuenta si no existe.
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
            <Text style={{ fontSize: 32, fontWeight: "800", color: colors.text }}>
              Crea tu cuenta
            </Text>
            <Text style={{ fontSize: 15, color: colors.textMuted }}>
              Empieza a registrar tus comidas en segundos
            </Text>
          </View>

          <Field
            label="Nombre"
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
          />
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
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Crear cuenta" onPress={onSubmit} loading={busy} />

          <OrDivider />
          <GoogleButton onPress={onGoogle} loading={busyGoogle} title="Registrarte con Google" />

          <Link
            href="/(auth)/login"
            style={{
              textAlign: "center",
              color: colors.primaryDark,
              fontSize: 15,
              paddingVertical: spacing.sm,
            }}
          >
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
