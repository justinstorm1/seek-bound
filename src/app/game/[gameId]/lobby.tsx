import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Pressable, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '../../../components/Button';
import { AvatarStack, PlayerRow } from '../../../components/gameUi';
import { Clock, Eye, MapPin, Radio, Share as ShareIcon } from '../../../components/icons';
import {
  Banner,
  Card,
  CenteredLoader,
  Screen,
  SectionLabel,
  useTheme,
  type ThemeColors,
} from '../../../components/ui';
import { useBackgroundLocationPrewarm } from '../../../hooks/useBackgroundLocationPrewarm';
import { formatDuration, formatInterval, formatRadius } from '../../../lib/game';
import { encodeJoinQr } from '../../../lib/qr';

export default function Lobby() {
  const { gameId } = useLocalSearchParams<{ gameId: Id<'games'> }>();
  const { theme } = useTheme();
  const lobby = useQuery(api.games.getLobby, { gameId });
  useBackgroundLocationPrewarm(lobby?.status === 'lobby');
  const startGame = useMutation(api.games.startGame);
  const leaveGame = useMutation(api.games.leaveGame);
  const deleteGame = useMutation(api.games.deleteGame);

  const status = lobby?.status;
  useEffect(() => {
    if (lobby === null) {
      router.replace('/(tabs)/(home)');
    } else if (status === 'starting' || status === 'active') {
      router.replace({ pathname: '/game/[gameId]/play', params: { gameId } });
    } else if (status === 'finished') {
      router.replace({ pathname: '/game/[gameId]/results', params: { gameId } });
    }
  }, [lobby, status, gameId]);

  if (lobby === undefined || lobby === null) return <CenteredLoader />;

  const share = () => {
    Share.share({
      message: `Join my SeekBound game — code ${lobby.code}\nhideandseek://join?code=${lobby.code}`,
    }).catch(() => {});
  };

  const start = async () => {
    try {
      await startGame({ gameId });
    } catch (e) {
      Alert.alert('Cannot start', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const leave = () => {
    Alert.alert(
      lobby.isHost ? 'Delete game?' : 'Leave game?',
      lobby.isHost ? 'This removes the game for everyone.' : 'You can rejoin with the code.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: lobby.isHost ? 'Delete' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (lobby.isHost) await deleteGame({ gameId });
            else await leaveGame({ gameId });
            router.replace('/(tabs)/(home)');
          },
        },
      ],
    );
  };

  return (
    <Screen title="Lobby">
      <Card theme={theme} className="items-center px-6 py-7 gap-4">
        <Text
          className="font-bold uppercase"
          style={{ color: theme.textTertiary, fontSize: 11, letterSpacing: 1 }}
        >
          Game code
        </Text>
        <Pressable onPress={share} className="items-center gap-1">
          <Text style={{ color: theme.text, fontSize: 40, fontWeight: '800', letterSpacing: 8 }}>
            {lobby.code}
          </Text>
        </Pressable>

        <View className="p-4 rounded-3xl" style={{ backgroundColor: '#FFFFFF' }}>
          <QRCode value={encodeJoinQr(lobby.code)} size={168} backgroundColor="#FFFFFF" />
        </View>

        <Text className="text-center" style={{ color: theme.textSecondary, fontSize: 13.5, lineHeight: 19 }}>
          Others join by entering the code or scanning this.
        </Text>
        <Button
          label="Share invite"
          variant="tonal"
          size="md"
          onPress={share}
          icon={<ShareIcon size={17} color={theme.text} />}
        />
      </Card>

      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        <SettingChip theme={theme} icon={<MapPin size={13} color={theme.chipText} />} label={`${formatRadius(lobby.settings.radiusMeters * 2)} area`} />
        <SettingChip theme={theme} icon={<Clock size={13} color={theme.chipText} />} label={formatDuration(lobby.settings.durationSeconds)} />
        <SettingChip theme={theme} icon={<Radio size={13} color={theme.chipText} />} label={`Ping ${formatInterval(lobby.settings.pingIntervalSeconds)}`} />
        <SettingChip
          theme={theme}
          icon={<Eye size={13} color={theme.chipText} />}
          label={`${lobby.settings.startingSeekers} seeker${lobby.settings.startingSeekers > 1 ? 's' : ''}`}
        />
      </View>

      <View className="gap-2.5">
        <SectionLabel
          theme={theme}
          right={
            <AvatarStack
              people={lobby.players.map((p) => ({ name: p.displayName, avatarUrl: p.avatarUrl }))}
              size={24}
            />
          }
        >
          Players · {lobby.players.length}
        </SectionLabel>
        <View className="gap-2">
          {lobby.players.map((p) => (
            <PlayerRow
              key={p.userId}
              name={p.isMe ? `${p.displayName} (you)` : p.displayName}
              avatarUrl={p.avatarUrl}
              isHost={p.isHost}
              onPress={
                p.isMe
                  ? undefined
                  : () => router.push({ pathname: '/user/[userId]', params: { userId: p.userId } })
              }
            />
          ))}
        </View>
      </View>

      {lobby.isHost ? (
        <View className="gap-3 mt-1">
          {!lobby.canStart ? (
            <Banner theme={theme} tone="info">
              Need at least 2 players to start.
            </Banner>
          ) : null}
          <Button label="Start game" onPress={start} disabled={!lobby.canStart} />
          <Pressable className="py-2 items-center" onPress={leave}>
            <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '700' }}>Delete game</Text>
          </Pressable>
        </View>
      ) : (
        <View className="gap-3 mt-1">
          <Banner theme={theme} tone="info">
            Waiting for the host to start…
          </Banner>
          <Pressable className="py-2 items-center" onPress={leave}>
            <Text style={{ color: theme.danger, fontSize: 14, fontWeight: '700' }}>Leave game</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function SettingChip({
  theme,
  icon,
  label,
}: {
  theme: ThemeColors;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{ backgroundColor: theme.chipBackground, paddingHorizontal: 12, paddingVertical: 7, gap: 6 }}
    >
      {icon}
      <Text style={{ color: theme.chipText, fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
