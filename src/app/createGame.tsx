import { Host, Slider } from '@expo/ui';
import { useMutation } from 'convex/react';
import * as Location from 'expo-location';
import type { Coordinates } from 'expo-maps/build/shared.types';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { GameMap } from '../components/GameMap';
import { Clock, Eye, MapPin, Plus, Radio } from '../components/icons';
import {
  Banner,
  Card,
  Field,
  PageTitle,
  Screen,
  Segmented,
  useTheme,
  type ThemeColors,
} from '../components/ui';
import {
  DIAMETER_DEFAULT_MILES,
  DIAMETER_MAX_MILES,
  DIAMETER_MIN_MILES,
  DIAMETER_STEP_MILES,
  DURATION_OPTIONS,
  formatDuration,
  formatInterval,
  formatRadius,
  METERS_PER_MILE,
  PING_OPTIONS,
  SEEKER_OPTIONS,
} from '../lib/game';

// Simulators / cold GPS often reject getCurrentPositionAsync (kCLErrorDomain 0).
async function getInitialCoords(): Promise<Coordinates | null> {
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) return { latitude: last.coords.latitude, longitude: last.coords.longitude };
  } catch {
    // fall through
  }
  try {
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: current.coords.latitude, longitude: current.coords.longitude };
  } catch {
    return null;
  }
}

export default function CreateGame() {
  const { theme, isDark } = useTheme();
  const createGame = useMutation(api.games.createGame);

  const [locationGranted, setLocationGranted] = useState(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [diameterMeters, setDiameterMeters] = useState(
    Math.round(DIAMETER_DEFAULT_MILES * METERS_PER_MILE),
  );
  const [durationSeconds, setDurationSeconds] = useState(45 * 60);
  const [pingIntervalSeconds, setPingIntervalSeconds] = useState(60);
  const [startingSeekers, setStartingSeekers] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let granted = false;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        granted = status === 'granted';
      } catch {
        granted = false;
      }
      if (cancelled) return;
      setLocationGranted(granted);
      if (!granted) return;
      const point = await getInitialCoords();
      if (cancelled || !point) return;
      setUserCoords(point);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sliderValue = diameterMeters / METERS_PER_MILE;
  const circleRadiusMeters = diameterMeters / 2;
  const formattedDiameter = useMemo(() => formatRadius(diameterMeters), [diameterMeters]);

  const handleCreate = async () => {
    setError(null);
    if (!userCoords) {
      setError('We need your location to center the play area. Enable location and retry.');
      return;
    }
    try {
      setBusy(true);
      const { gameId } = await createGame({
        center: { lat: userCoords.latitude ?? 0, lng: userCoords.longitude ?? 0 },
        radiusMeters: circleRadiusMeters,
        durationSeconds,
        pingIntervalSeconds,
        startingSeekers,
      });
      router.replace({ pathname: '/game/[gameId]/lobby', params: { gameId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the game.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Create Game">
      <PageTitle theme={theme} title="New game" subtitle="Set the play area and the rules for this round." />

      <Card theme={theme}>
        <View className="w-full" style={{ height: 260 }}>
          {userCoords ? (
            <GameMap
              center={{ lat: userCoords.latitude ?? 0, lng: userCoords.longitude ?? 0 }}
              radiusMeters={circleRadiusMeters}
              followsUser={locationGranted}
              zoom={14}
            />
          ) : (
            <View
              className="flex-1 items-center justify-center px-8 gap-2"
              style={{ backgroundColor: theme.mapBackground }}
            >
              <MapPin size={24} color={theme.textTertiary} />
              <Text className="text-center" style={{ color: theme.textSecondary, fontSize: 13.5 }}>
                {locationGranted
                  ? 'Finding your location…'
                  : 'Location access is needed to set the play area.'}
              </Text>
            </View>
          )}
        </View>
        <View className="px-4 py-4 gap-3" style={{ borderTopWidth: 1, borderColor: theme.divider }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <MapPin size={16} color={theme.textSecondary} />
              <Text className="font-semibold" style={{ color: theme.text, fontSize: 15 }}>
                Play area
              </Text>
            </View>
            <View
              className="rounded-full"
              style={{ backgroundColor: theme.chipGreen, paddingHorizontal: 10, paddingVertical: 4 }}
            >
              <Text style={{ color: theme.chipGreenText, fontSize: 12, fontWeight: '700' }}>
                {formattedDiameter} across
              </Text>
            </View>
          </View>
          <Host style={{ width: '100%', height: 36 }} colorScheme={isDark ? 'dark' : 'light'} seedColor={theme.primary}>
            <Slider
              value={sliderValue}
              min={DIAMETER_MIN_MILES}
              max={DIAMETER_MAX_MILES}
              step={DIAMETER_STEP_MILES}
              onValueChange={(miles: number) => setDiameterMeters(Math.round(miles * METERS_PER_MILE))}
            />
          </Host>
        </View>
      </Card>

      <Card theme={theme}>
        <Field theme={theme} label="Time limit" hint="How long hiders need to survive.">
          <Segmented theme={theme} options={DURATION_OPTIONS} value={durationSeconds} onChange={setDurationSeconds} />
        </Field>
        <View style={{ height: 1, marginHorizontal: 16, backgroundColor: theme.divider }} />
        <Field
          theme={theme}
          label="Hider location updates"
          hint="How often a hider's position is revealed to seekers."
        >
          <Segmented
            theme={theme}
            options={PING_OPTIONS}
            value={pingIntervalSeconds}
            onChange={setPingIntervalSeconds}
          />
        </Field>
        <View style={{ height: 1, marginHorizontal: 16, backgroundColor: theme.divider }} />
        <Field theme={theme} label="Starting seekers" hint="Everyone else starts as a hider.">
          <Segmented
            theme={theme}
            options={SEEKER_OPTIONS}
            value={startingSeekers}
            onChange={setStartingSeekers}
          />
        </Field>
      </Card>

      <Card theme={theme} tone="green" className="p-4 gap-3">
        <Text
          className="font-bold uppercase"
          style={{ color: theme.primaryDark, fontSize: 11, letterSpacing: 0.6 }}
        >
          Summary
        </Text>
        <View className="gap-2.5">
          <SummaryRow theme={theme} icon={<MapPin size={15} color={theme.primaryDark} />} text={`${formattedDiameter} play area`} />
          <SummaryRow theme={theme} icon={<Clock size={15} color={theme.primaryDark} />} text={`${formatDuration(durationSeconds)} round`} />
          <SummaryRow
            theme={theme}
            icon={<Radio size={15} color={theme.primaryDark} />}
            text={`Hider pings every ${formatInterval(pingIntervalSeconds)}`}
          />
          <SummaryRow
            theme={theme}
            icon={<Eye size={15} color={theme.primaryDark} />}
            text={`${startingSeekers} starting seeker${startingSeekers > 1 ? 's' : ''}`}
          />
        </View>
      </Card>

      {error ? <Banner theme={theme} tone="danger">{error}</Banner> : null}

      <View className="mt-1">
        <Button
          label="Create game"
          onPress={handleCreate}
          loading={busy}
          icon={<Plus size={19} color={theme.buttonPrimaryText} strokeWidth={2.6} />}
        />
      </View>
    </Screen>
  );
}

function SummaryRow({
  theme,
  icon,
  text,
}: {
  theme: ThemeColors;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      {icon}
      <Text style={{ color: theme.primaryDark, fontSize: 14, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}
