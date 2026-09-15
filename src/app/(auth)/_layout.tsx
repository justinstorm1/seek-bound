import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen
        name="reviewer-login"
        options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }}
      />
    </Stack>
  );
}
