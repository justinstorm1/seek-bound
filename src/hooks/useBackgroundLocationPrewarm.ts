import { useQuery } from 'convex/react';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { api } from '../../convex/_generated/api';
import { confirmBackgroundLocationDisclosure } from '../lib/locationDisclosure';

/**
 * Requests foreground + "Always" location permission ahead of time (e.g. from
 * the lobby) so the OS dialog is dealt with during a calm moment rather than
 * the instant the round starts and the player is heading into the map screen.
 */
export function useBackgroundLocationPrewarm(enabled: boolean) {
  const flags = useQuery(api.config.flags);
  const want = enabled && (flags?.backgroundLocation ?? false);

  useEffect(() => {
    if (!want) return;
    let cancelled = false;
    (async () => {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (cancelled || fg.status !== 'granted') return;
      const current = await Location.getBackgroundPermissionsAsync();
      if (cancelled || current.status === 'granted' || !current.canAskAgain) return;
      await confirmBackgroundLocationDisclosure();
      if (cancelled) return;
      await Location.requestBackgroundPermissionsAsync().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [want]);
}
