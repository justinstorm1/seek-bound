import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

/** Guards against the rare case where the native layer hands back a raw
 * device token instead of an Expo-wrapped one (seen on some simulators). */
function isValidExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registers this device for push notifications once `enabled` (signed in with
 * a profile), and keeps the token Convex has on file current. Requesting
 * permission here — rather than only reactively — is what lets an admin
 * broadcast reach a player who never otherwise triggers a system prompt.
 */
export function usePushNotifications(enabled: boolean) {
  const registerToken = useMutation(api.push.registerToken);
  const currentToken = useRef<string | null>(null);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== 'granted' && existing.canAskAgain) {
        status = (await Notifications.requestPermissionsAsync()).status;
      }
      if (cancelled || status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      const { data: token } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      if (cancelled || currentToken.current === token || !isValidExpoPushToken(token)) return;

      currentToken.current = token;
      await registerToken({ token, platform }).catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, platform, registerToken]);

  // Expo occasionally rotates the underlying push token; keep Convex in sync.
  useEffect(() => {
    if (!enabled) return;
    const sub = Notifications.addPushTokenListener((event) => {
      if (currentToken.current === event.data || !isValidExpoPushToken(event.data)) return;
      currentToken.current = event.data;
      registerToken({ token: event.data, platform }).catch(() => {});
    });
    return () => sub.remove();
  }, [enabled, platform, registerToken]);
}
