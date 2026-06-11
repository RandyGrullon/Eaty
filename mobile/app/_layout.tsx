import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AppDataProvider } from "@/hooks/use-app-data";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import { colors } from "@/lib/theme";

function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="paywall"
          options={{ presentation: "modal", headerShown: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AppDataProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppDataProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
