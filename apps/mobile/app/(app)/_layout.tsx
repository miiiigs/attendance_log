import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#F8F7F4",
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="activities" />
      <Stack.Screen name="communities" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="community/[id]" />
      <Stack.Screen name="create-activity" />
      <Stack.Screen name="join-community" />
      <Stack.Screen name="scan" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}
