import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../src/store/auth";

const queryClient = new QueryClient();

// Root layout: provides react-query and gates the router on secure-store hydration.
// While the persisted token is loading we show a splash; auth-aware routing (token
// present → app, absent → login) lands in Phase 5. See docs/mobile-build.md §
// Session lifecycle.
export default function RootLayout() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      {hasHydrated ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      )}
    </QueryClientProvider>
  );
}
