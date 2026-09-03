import "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../providers/auth-provider";
import { deriveAuthState, resolveRouteRedirect } from "../lib/navigation";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigation />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigation() {
  const router = useRouter();
  const segments = useSegments();
  const { loading, session, isGuest } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    SplashScreen.hideAsync().catch(() => undefined);

    const inAuthGroup = segments[0] === "(auth)";
    const state = deriveAuthState(Boolean(session), isGuest);
    const redirect = resolveRouteRedirect(state, inAuthGroup);

    if (redirect) {
      router.replace(redirect);
    }
  }, [loading, router, segments, session, isGuest]);

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
