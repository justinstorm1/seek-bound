import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Pulse } from '../../../components/anim';
import { GameMap, type MapMarker } from '../../../components/GameMap';
import { RoleBadge } from '../../../components/gameUi';
import { Crosshair, Eye, MessageIcon, QrCode, Radio, Run } from '../../../components/icons';
import { Banner, CenteredLoader, PipRow, ProgressRing, useTheme, type ThemeColors } from '../../../components/ui';
import { useLocationReporter } from '../../../hooks/useLocationReporter';
import { useNow } from '../../../hooks/useNow';
import { usePresenceReporter } from '../../../hooks/usePresenceReporter';
import { proximityBucket } from '../../../lib/achievements';
import { distanceMeters, formatAgo, formatClock } from '../../../lib/game';

const STALE_PING_MS = 90_000;

export default function Play() {
  const { gameId } = useLocalSearchParams<{ gameId: Id<'games'> }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);

  const state = useQuery(api.games.getGameState, { gameId });
  const isActive = state?.status === 'active' || state?.status === 'starting';
  const revealed = useQuery(api.games.revealedLocations, {
    gameId,
    now: Math.floor(now / 5000) * 5000,
  });
  const nearest = useQuery(
    api.games.nearestHiderDistance,
    state?.status === 'active' && state.me.role === 'seeker' ? { gameId } : 'skip',
  );
  const unreadMessages = useQuery(api.chat.unreadCount, { gameId });
  const deleteGame = useMutation(api.games.deleteGame);
  const leaveGame = useMutation(api.games.leaveGame);
  const { location } = useLocationReporter({
    gameId,
    active: isActive,
    alive: state?.me.status === 'alive',
  });
  usePresenceReporter({ gameId, active: isActive });

  const status = state?.status;
  useEffect(() => {
    if (state === null) {
      router.replace('/(tabs)/(home)');
    } else if (status === 'lobby') {
      router.replace({ pathname: '/game/[gameId]/lobby', params: { gameId } });
    } else if (status === 'finished') {
      router.replace({ pathname: '/game/[gameId]/results', params: { gameId } });
    }
  }, [state, status, gameId]);

  const leave = () => {
    Alert.alert('Leave game?', "You'll drop out of this round. You can rejoin with the code.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveGame({ gameId });
          router.replace('/(tabs)/(home)');
        },
      },
    ]);
  };

  const endGame = () => {
    Alert.alert('End game?', 'This deletes the game for everyone. No results are saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End game',
        style: 'destructive',
        onPress: async () => {
          await deleteGame({ gameId });
          router.replace('/(tabs)/(home)');
        },
      },
    ]);
  };

  if (state === undefined || state === null) return <CenteredLoader />;

  const isSeeker = state.me.role === 'seeker';
  const isFound = state.me.status === 'found';

  const markers: MapMarker[] = [];
  if (location) {
    markers.push({ id: 'me', lat: location.latitude, lng: location.longitude, kind: 'you', title: 'You' });
  }
  for (const mate of revealed?.teammates ?? []) {
    markers.push({
      id: mate.userId,
      lat: mate.lat,
      lng: mate.lng,
      kind: isSeeker ? 'seeker' : 'hider',
      title: mate.away ? `${mate.displayName} · away` : mate.displayName,
      muted: mate.away,
    });
  }
  for (const ping of revealed?.pings ?? []) {
    const stale = now - ping.pingAt > STALE_PING_MS;
    markers.push({
      id: `ping-${ping.userId}`,
      lat: ping.lat,
      lng: ping.lng,
      kind: 'ping',
      title: `${ping.displayName} · ${formatAgo(now - ping.pingAt)}${ping.away ? ' · away' : ''}`,
      muted: stale || ping.away,
    });
  }

  // Countdown before the game goes live.
  if (state.status === 'starting') {
    const secs = Math.max(0, Math.ceil(((state.startsAt ?? now) - now) / 1000));
    const role = state.me.role === 'seeker' ? 'seeker' : 'hider';
    return (
      <View
        className="flex-1 items-center justify-center gap-7 px-8"
        style={{ backgroundColor: role === 'seeker' ? theme.seekerLight : theme.hiderLight }}
      >
        <Text
          className="uppercase"
          style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '700', letterSpacing: 3 }}
        >
          You are a
        </Text>
        <Animated.View entering={ZoomIn.delay(120).duration(420).springify().damping(12)}>
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: 96,
              height: 96,
              backgroundColor: role === 'seeker' ? theme.seeker : theme.primary,
            }}
          >
            {role === 'seeker' ? <Eye size={44} color="#FFFFFF" /> : <Run size={44} color="#FFFFFF" />}
          </View>
        </Animated.View>
        <Animated.View entering={ZoomIn.delay(220).duration(360)}>
          <RoleBadge role={role} />
        </Animated.View>
        <Animated.Text
          key={secs}
          entering={ZoomIn.duration(260)}
          style={{ color: theme.text, fontSize: 76, fontWeight: '800' }}
        >
          {secs}
        </Animated.Text>
        <Text className="text-center" style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 21 }}>
          {isSeeker
            ? 'Hunt down every hider before time runs out.'
            : 'Get moving — stay hidden until the timer ends.'}
        </Text>
        <Pressable className="py-2 px-4" onPress={state.isHost ? endGame : leave}>
          <Text style={{ color: theme.danger, fontWeight: '700' }}>
            {state.isHost ? 'End game' : 'Leave game'}
          </Text>
        </Pressable>
      </View>
    );
  }

  const totalMs = Math.max(1, (state.endsAt ?? now) - (state.startsAt ?? now));
  const remainingMs = Math.max(0, (state.endsAt ?? now) - now);
  const remainingFrac = Math.max(0, Math.min(1, remainingMs / totalMs));

  const pingIntervalMs = state.pingIntervalSeconds * 1000;
  const lastPingAt = state.lastPingAt ?? state.startsAt ?? now;
  const nextPingAt = lastPingAt + pingIntervalMs;
  const nextPingInMs = Math.max(0, nextPingAt - now);
  const pingFrac = Math.max(0, Math.min(1, 1 - nextPingInMs / pingIntervalMs));

  const isHider = state.me.role === 'hider';
  const locallyOutside =
    isHider &&
    !isSeeker &&
    location != null &&
    distanceMeters({ lat: location.latitude, lng: location.longitude }, state.center) >
      state.radiusMeters;
  const showBoundaryWarning =
    isHider && !isFound && (locallyOutside || state.me.outOfBoundsSince != null);
  const boundarySecondsLeft =
    state.me.outOfBoundsSince != null
      ? Math.max(
          0,
          Math.ceil((state.me.outOfBoundsSince + state.outOfBoundsGraceMs - now) / 1000),
        )
      : null;

  const timeLow = remainingMs < 60_000;
  const hint = isSeeker && !isFound ? proximityBucket(nearest ?? null) : null;
  const hintColor = hint
    ? { red: theme.danger, orange: theme.orange, yellow: theme.warning, blue: theme.blue }[hint.tone]
    : theme.blue;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <GameMap
        center={state.center}
        boundaryCenter={state.center}
        radiusMeters={state.radiusMeters}
        markers={markers}
      />

      <View className="absolute left-0 right-0 px-4 gap-2" style={{ top: insets.top + 8 }}>
        <View className="flex-row items-start justify-between">
          <View
            className="flex-row items-center rounded-2xl"
            style={{ backgroundColor: theme.glassStrong, paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}
          >
            <ProgressRing
              size={38}
              strokeWidth={4}
              progress={remainingFrac}
              color={timeLow ? theme.danger : theme.primary}
              trackColor={theme.divider}
            />
            <View>
              <Text
                style={{
                  color: timeLow ? theme.danger : theme.text,
                  fontSize: 22,
                  fontWeight: '800',
                  letterSpacing: 0.5,
                }}
              >
                {formatClock(remainingMs)}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 10.5, fontWeight: '700' }}>
                TIME LEFT
              </Text>
            </View>
          </View>

          <View
            className="items-end rounded-2xl"
            style={{ backgroundColor: theme.glassStrong, paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}
          >
            <RoleBadge role={isSeeker ? 'seeker' : 'hider'} size="sm" />
            <View className="flex-row items-center gap-2">
              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '700' }}>
                {state.hidersAlive}/{state.hidersTotal} hiders
              </Text>
              {state.hidersTotal <= 8 ? (
                <PipRow
                  total={state.hidersTotal}
                  filled={state.hidersAlive}
                  onColor={theme.hider}
                  offColor={theme.divider}
                  size={7}
                />
              ) : null}
            </View>
          </View>
        </View>

        <View
          className="self-center rounded-full overflow-hidden"
          style={{ backgroundColor: theme.glassStrong }}
        >
          <View className="flex-row items-center px-3 py-1.5" style={{ gap: 7 }}>
            <Radio size={13} color={theme.ping} />
            <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>
              {isSeeker ? 'Next reveal' : 'Next ping'} {formatClock(nextPingInMs)}
            </Text>
          </View>
          <View style={{ height: 2, backgroundColor: theme.divider }}>
            <View style={{ height: 2, width: `${pingFrac * 100}%`, backgroundColor: theme.ping }} />
          </View>
        </View>

        {hint ? (
          <View
            className="self-center rounded-full overflow-hidden"
            style={{ backgroundColor: theme.glassStrong }}
          >
            <View className="flex-row items-center px-3 py-1.5" style={{ gap: 7 }}>
              <Crosshair size={13} color={hintColor} />
              <Text style={{ color: hintColor, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>
                {hint.label.toUpperCase()}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11, fontWeight: '600' }}>
                nearest hider
              </Text>
            </View>
            <View style={{ height: 2, backgroundColor: theme.divider }}>
              <View style={{ height: 2, width: `${hint.fill * 100}%`, backgroundColor: hintColor }} />
            </View>
          </View>
        ) : null}

        {showBoundaryWarning ? (
          <Animated.View entering={FadeInDown.duration(280)}>
            <Pulse
              min={1}
              max={1.03}
              duration={850}
              className="items-center px-4 py-3 rounded-2xl gap-0.5"
              style={{ backgroundColor: theme.danger }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>
                {boundarySecondsLeft != null
                  ? `RETURN TO THE ZONE · ${boundarySecondsLeft}s`
                  : 'RETURN TO THE ZONE'}
              </Text>
              <Text style={{ color: '#FFFFFF', opacity: 0.9, fontSize: 12, fontWeight: '600' }}>
                You&apos;re out of bounds — get back in or you&apos;re eliminated.
              </Text>
            </Pulse>
          </Animated.View>
        ) : null}
      </View>

      <View className="absolute left-0 right-0 px-4 gap-3" style={{ bottom: insets.bottom + 16 }}>
        {isFound ? (
          <Banner theme={theme} tone="warning">
            {state.me.foundReason === 'out_of_bounds'
              ? "Eliminated — you left the play area. You're spectating now."
              : "You've been found — you're spectating now."}
          </Banner>
        ) : null}
        <View className="flex-row gap-3">
          {isSeeker && !isFound ? (
            <ActionButton
              theme={theme}
              label="Scan to tag"
              tone="primary"
              icon={<Eye size={19} color={theme.textOnPrimary} />}
              onPress={() => router.push({ pathname: '/game/[gameId]/scan', params: { gameId } })}
            />
          ) : null}
          {!isSeeker && !isFound ? (
            <ActionButton
              theme={theme}
              label="Show my QR"
              tone="primary"
              icon={<QrCode size={19} color={theme.textOnPrimary} />}
              onPress={() => router.push({ pathname: '/game/[gameId]/qr', params: { gameId } })}
            />
          ) : null}
          <ActionButton
            theme={theme}
            label="Chat"
            tone="neutral"
            icon={<MessageIcon size={19} color={theme.text} />}
            badge={unreadMessages}
            onPress={() => router.push({ pathname: '/game/[gameId]/chat', params: { gameId } })}
          />
        </View>
        <Pressable className="self-center py-2 px-4" onPress={state.isHost ? endGame : leave}>
          <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 13 }}>
            {state.isHost ? 'End game' : 'Leave game'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ActionButton({
  theme,
  label,
  tone,
  icon,
  badge,
  onPress,
}: {
  theme: ThemeColors;
  label: string;
  tone: 'primary' | 'neutral';
  icon: React.ReactNode;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="flex-1 flex-row items-center justify-center rounded-2xl"
      style={{
        paddingVertical: 15,
        gap: 8,
        backgroundColor: tone === 'primary' ? theme.primary : theme.glassStrong,
      }}
      onPress={onPress}
    >
      <View>
        {icon}
        {badge ? (
          <View
            className="items-center justify-center"
            style={{
              position: 'absolute',
              top: -6,
              right: -8,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 3,
              borderRadius: 8,
              backgroundColor: theme.danger,
            }}
          >
            <Text style={{ color: theme.white, fontSize: 10, fontWeight: '800' }}>
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={{
          color: tone === 'primary' ? theme.textOnPrimary : theme.text,
          fontSize: 15,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
