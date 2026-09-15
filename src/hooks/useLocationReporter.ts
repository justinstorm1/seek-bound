import { useMutation, useQuery } from 'convex/react';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { startBackgroundLocation, stopBackgroundLocation } from '../lib/backgroundLocation';

export type LiveLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
} | null;

type Options = {
  gameId: Id<'games'> | null;
  /** Only report while the game is running. */
  active: boolean;
  /** Only run the background service while the player is still in play. */
  alive?: boolean;
  /** Minimum ms between backend writes. */
  throttleMs?: number;
};

/**
 * Watches the device location at the highest available precision, keeps it
 * locally for the map, and pushes throttled updates to Convex. When the
 * `backgroundLocation` flag is on it also runs a background task so a player who
 * backgrounds the app keeps reporting. The backend decides what other players
 * see and enforces the play-area boundary.
 */
export function useLocationReporter({
  gameId,
  active,
  alive = true,
  throttleMs = 3000,
}: Options) {
  const submitLocation = useMutation(api.games.submitLocation);
  const [location, setLocation] = useState<LiveLocation>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // Flips true only after the foreground grant lands — the background effect
  // waits on this so it never races the foreground permission request.
  const [foregroundGranted, setForegroundGranted] = useState(false);
  const lastSentAt = useRef(0);

  const token = useQuery(api.games.myToken, gameId ? { gameId } : 'skip');
  const flags = useQuery(api.config.flags);

  // ── Foreground watch (drives the live map) ────────────────────────────────
  useEffect(() => {
    if (!active || gameId === null) return;

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }
      if (cancelled) return;
      setForegroundGranted(true);
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 1,
          timeInterval: 1000,
        },
        (position) => {
          if (cancelled) return;
          const { latitude, longitude, accuracy } = position.coords;
          setLocation({ latitude, longitude, accuracy: accuracy ?? null });

          const now = Date.now();
          if (now - lastSentAt.current < throttleMs) return;
          lastSentAt.current = now;
          void submitLocation({ gameId, lat: latitude, lng: longitude }).catch(() => {
            lastSentAt.current = 0;
          });
        },
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [active, gameId, throttleMs, submitLocation]);

  // ── Background task (keeps reporting when the app is backgrounded) ─────────
  const wantBackground =
    active &&
    alive &&
    foregroundGranted &&
    (flags?.backgroundLocation ?? false) &&
    typeof token === 'string' &&
    !!token;

  useEffect(() => {
    const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
    if (!wantBackground || !siteUrl || typeof token !== 'string') {
      void stopBackgroundLocation();
      return;
    }

    let cancelled = false;
    (async () => {
      // Ask for "Always". Start regardless of the answer: on iOS the task runs
      // foreground-only with "When in Use" and iOS prompts to upgrade later; on
      // Android `startLocationUpdatesAsync` throws without it and is caught.
      try {
        await Location.requestBackgroundPermissionsAsync();
      } catch {
        // ignore — proceed to start anyway
      }
      if (cancelled) return;
      await startBackgroundLocation({ siteUrl, token });
    })();

    return () => {
      cancelled = true;
      void stopBackgroundLocation();
    };
  }, [wantBackground, token]);

  return { location, permissionDenied };
}
