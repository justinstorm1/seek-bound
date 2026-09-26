import 'react-native-url-polyfill/auto';

import { ConvexAuthProvider, useConvexAuth } from '@convex-dev/auth/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConvexReactClient, useQuery } from 'convex/react';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { api } from '../../convex/_generated/api';
import { SplashGate } from '../components/SplashGate';
import { usePushNotifications } from '../hooks/usePushNotifications';
// Registers the background-location TaskManager task at startup.
import '../lib/backgroundLocation';
import './global.css';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

function InitialLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.profiles.getMyProfile, isAuthenticated ? {} : 'skip');
  usePushNotifications(isAuthenticated && !!profile);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.NavigationBar.setHidden(true);
    }
  }, []);

  const bootReady = !isLoading && !(isAuthenticated && profile === undefined);
  const needsProfile = isAuthenticated && profile === null;

  return (
    <SplashGate ready={bootReady}>
      {bootReady ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={needsProfile}>
            <Stack.Screen name="profile-setup" />
          </Stack.Protected>
          <Stack.Protected guard={isAuthenticated && !needsProfile}>
            <Stack.Screen name="(tabs)" options={{ headerTitle: "" }} />
            <Stack.Screen name="createGame" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', headerBackTitle: "Home" }} />
            <Stack.Screen name="join" options={{ headerShown: true, presentation: 'modal' }} />
            <Stack.Screen name="scan-join" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="leaderboard" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="admin-broadcast" options={{ headerShown: true, presentation: 'modal' }} />
            <Stack.Screen name="user/[userId]" options={{ headerShown: true, headerTransparent: true, headerBackButtonDisplayMode: 'minimal', headerTitle: '' }} />
            <Stack.Screen name="game/[gameId]" />
          </Stack.Protected>
        </Stack>
      ) : null}
    </SplashGate>
  );
}

export default function RootLayout() {
  return (
    <ConvexAuthProvider client={convex} storage={AsyncStorage}>
      <KeyboardProvider>
        <InitialLayout />
      </KeyboardProvider>
    </ConvexAuthProvider>
  );
}
