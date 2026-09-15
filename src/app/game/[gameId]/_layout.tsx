import { Stack } from 'expo-router';
import { useTheme } from '../../../components/ui';

export default function GameLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.text,
        headerStyle: { backgroundColor: theme.background },
        contentStyle: { backgroundColor: theme.background },
        // Game screens are driven by game state — no swiping between them.
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="lobby" options={{ headerTitle: 'Lobby' }} />
      <Stack.Screen name="play" options={{ headerShown: false, headerTitle: "Play" }} />
      <Stack.Screen name="scan" options={{ headerShown: false }} />
      <Stack.Screen name="qr" options={{ headerTitle: 'Your QR code' }} />
      <Stack.Screen name="chat" options={{ headerTitle: 'Chat', headerBackButtonDisplayMode: "minimal" }} />
      <Stack.Screen name="results" options={{ headerTitle: 'Results', headerBackVisible: false }} />
    </Stack>
  );
}
