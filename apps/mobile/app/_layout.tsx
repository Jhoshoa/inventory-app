import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="pos" options={{ title: "POS", headerShown: false }} />
      <Stack.Screen name="qr/[id]" options={{ title: "QR Code" }} />
    </Stack>
  );
}
