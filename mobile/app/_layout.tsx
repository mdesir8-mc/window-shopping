import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

// Root layout. Auth gating (hasHydrated splash → app vs login) lands in Phase 5
// once the secure-store auth store is ported. See docs/mobile-build.md § Session lifecycle.
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
