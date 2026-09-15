import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export const BG_LOCATION_TASK = 'seekbound-background-location';
const CREDS_KEY = 'seekbound.bgloc.creds';

type Creds = { siteUrl: string; token: string };

async function readCreds(): Promise<Creds | null> {
  try {
    const raw = await AsyncStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Creds>;
    if (typeof parsed.siteUrl === 'string' && typeof parsed.token === 'string') {
      return { siteUrl: parsed.siteUrl, token: parsed.token };
    }
    return null;
  } catch {
    return null;
  }
}

export async function isBackgroundLocationRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK);
  } catch {
    return false;
  }
}

export async function startBackgroundLocation(creds: Creds): Promise<void> {
  try {
    await AsyncStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  } catch {
    return;
  }
  if (await isBackgroundLocationRunning()) return;
  try {
    await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10,
      timeInterval: 10_000,
      deferredUpdatesInterval: 10_000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      activityType: Location.ActivityType.Fitness,
      foregroundService: {
        notificationTitle: 'SeekBound — game in progress',
        notificationBody: 'Sharing your location with the other players.',
        notificationColor: '#2ECC71',
      },
    });
  } catch {
    // No background permission / unsupported build — silently stay foreground-only.
  }
}

export async function stopBackgroundLocation(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CREDS_KEY);
  } catch {
    // ignore
  }
  try {
    if (await isBackgroundLocationRunning()) {
      await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
    }
  } catch {
    // ignore
  }
}

// Registered once at import time (see `_layout.tsx`). Wrapped so a missing
// native module can't take down app startup.
try {
  TaskManager.defineTask(BG_LOCATION_TASK, async ({ data, error }) => {
    if (error) return;
    const locations = (data as { locations?: Location.LocationObject[] } | null)?.locations;
    const last = locations && locations.length ? locations[locations.length - 1] : null;
    if (!last) return;

    const creds = await readCreds();
    if (!creds) {
      await stopBackgroundLocation();
      return;
    }

    try {
      const res = await fetch(`${creds.siteUrl}/reportLocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: creds.token,
          lat: last.coords.latitude,
          lng: last.coords.longitude,
        }),
      });
      const json = (await res.json().catch(() => null)) as { stop?: boolean } | null;
      if (json?.stop) await stopBackgroundLocation();
    } catch {
      // Offline / transient — leave the task running; the next fix retries.
    }
  });
} catch {
  // expo-task-manager native module not present in this build.
}
