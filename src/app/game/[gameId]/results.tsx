import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '../../../components/Button';
import { ScaleIn, Stagger } from '../../../components/anim';
import { Avatar } from '../../../components/gameUi';
import { Flag, Share as ShareIcon, Trophy } from '../../../components/icons';
import {
  Card,
  CenteredLoader,
  Pill,
  Screen,
  SectionLabel,
  useTheme,
  type ThemeColors,
} from '../../../components/ui';
import { roleLabel } from '../../../lib/game';

export default function Results() {
  const { gameId } = useLocalSearchParams<{ gameId: Id<'games'> }>();
  const { theme } = useTheme();
  const results = useQuery(api.games.getResults, { gameId });
  const rematch = useMutation(api.games.rematch);
  const [rematching, setRematching] = useState(false);

  const openProfile = (userId: Id<'users'>) =>
    router.push({ pathname: '/user/[userId]', params: { userId } });

  const startRematch = async () => {
    if (!results) return;
    if (results.rematchGameId) {
      router.replace({ pathname: '/game/[gameId]/lobby', params: { gameId: results.rematchGameId } });
      return;
    }
    try {
      setRematching(true);
      const res = await rematch({ gameId });
      router.replace({ pathname: '/game/[gameId]/lobby', params: { gameId: res.gameId } });
    } catch {
      setRematching(false);
    }
  };

  if (results === undefined) return <CenteredLoader />;
  if (results === null) {
    return (
      <Screen title="Results">
        <Text style={{ color: theme.text }}>Game not found.</Text>
        <Button label="Home" onPress={() => router.replace('/(tabs)/(home)')} />
      </Screen>
    );
  }

  const iWon = results.me.won;
  const heroBg = iWon ? theme.successLight : theme.dangerLight;
  const heroFg = iWon ? theme.successDark : theme.dangerDark;

  const seekers = results.players.filter((p) => p.role === 'seeker');
  const hiders = results.players.filter((p) => p.role === 'hider');

  const share = () => {
    const outcome = results.winner ? `${results.winner} won` : 'game over';
    Share.share({ message: `SeekBound — ${outcome}. I played as ${roleLabel(results.me.role)}.` }).catch(
      () => {},
    );
  };

  return (
    <Screen title="Results">
      <ScaleIn>
        <Card theme={theme} className="items-center px-6 py-8 gap-3" style={{ backgroundColor: heroBg }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 56, height: 56, backgroundColor: iWon ? theme.success : theme.danger }}
          >
            {iWon ? <Trophy size={26} color="#FFFFFF" /> : <Flag size={26} color="#FFFFFF" />}
          </View>
          <Text
            className="uppercase"
            style={{ color: heroFg, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 }}
          >
            {results.winner ? `${results.winner} win` : 'Game over'}
          </Text>
          <Text style={{ color: heroFg, fontSize: 34, fontWeight: '800' }}>
            {iWon ? 'You won' : 'You lost'}
          </Text>
          <Text style={{ color: heroFg, fontSize: 14, opacity: 0.9 }}>
            You played as {roleLabel(results.me.role)}
          </Text>
        </Card>
      </ScaleIn>

      {seekers.length > 0 ? (
        <View className="gap-2">
          <SectionLabel theme={theme}>Seekers</SectionLabel>
          <Card theme={theme} className="py-3">
            <Stagger delay={200} gap={50}>
              {seekers.map((p, i) => (
                <PlayerLine
                  key={p.userId}
                  theme={theme}
                  name={p.displayName}
                  avatarUrl={p.avatarUrl}
                  sub="Seeker"
                  first={i === 0}
                  tone="red"
                  onPress={() => openProfile(p.userId)}
                />
              ))}
            </Stagger>
          </Card>
        </View>
      ) : null}

      {hiders.length > 0 ? (
        <View className="gap-2">
          <SectionLabel theme={theme}>Hiders</SectionLabel>
          <Card theme={theme} className="py-3">
            <Stagger delay={300} gap={50}>
              {hiders.map((p, i) => (
                <PlayerLine
                  key={p.userId}
                  theme={theme}
                  name={p.displayName}
                  avatarUrl={p.avatarUrl}
                  sub={
                    p.status === 'found'
                      ? p.foundReason === 'out_of_bounds'
                        ? 'Left the play area'
                        : `Caught${p.foundByName ? ` by ${p.foundByName}` : ''}`
                      : 'Survived'
                  }
                  first={i === 0}
                  tone={p.status === 'found' ? 'red' : 'green'}
                  outcome={p.status === 'found' ? 'Caught' : 'Safe'}
                  onPress={() => openProfile(p.userId)}
                />
              ))}
            </Stagger>
          </Card>
        </View>
      ) : null}

      <View className="gap-2">
        <SectionLabel theme={theme}>Timeline</SectionLabel>
        <Card theme={theme} className="p-4">
          {results.timeline.map((e, i) => (
            <View key={e.id} className="flex-row" style={{ gap: 12 }}>
              <View className="items-center" style={{ width: 10 }}>
                <View
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    marginTop: 4,
                    backgroundColor: theme.primary,
                  }}
                />
                {i < results.timeline.length - 1 ? (
                  <View style={{ flex: 1, width: 2, backgroundColor: theme.divider, marginTop: 2 }} />
                ) : null}
              </View>
              <View className="flex-1" style={{ paddingBottom: i < results.timeline.length - 1 ? 14 : 0 }}>
                <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '600' }}>
                  {formatTime(e.at)}
                </Text>
                <Text style={{ color: theme.text, fontSize: 13.5, marginTop: 1, lineHeight: 18 }}>
                  {e.message}
                  {e.actorName ? ` · ${e.actorName}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </View>

      <Animated.View entering={FadeInDown.delay(200).duration(360)} className="gap-3 mt-1">
        {results.isHost || results.rematchGameId ? (
          <Button
            label={results.rematchGameId ? 'Go to rematch lobby' : 'Rematch'}
            onPress={startRematch}
            loading={rematching}
          />
        ) : null}
        <Button
          label="Share result"
          variant="tonal"
          size="md"
          onPress={share}
          icon={<ShareIcon size={16} color={theme.text} />}
        />
        <Button
          label="Back to home"
          variant={results.isHost || results.rematchGameId ? 'ghost' : 'primary'}
          onPress={() => router.replace('/(tabs)/(home)')}
        />
      </Animated.View>
    </Screen>
  );
}

function PlayerLine({
  theme,
  name,
  avatarUrl,
  sub,
  first,
  tone,
  outcome,
  onPress,
}: {
  theme: ThemeColors;
  name: string;
  avatarUrl: string | null;
  sub: string;
  first: boolean;
  tone: 'red' | 'green';
  outcome?: string;
  onPress?: () => void;
}) {
  return (
    <View>
      {!first ? (
        <View style={{ marginLeft: 76, marginVertical: 5 }}>
          <View style={{ height: 1, backgroundColor: theme.divider }} />
        </View>
      ) : null}
      <Pressable
        onPress={onPress}
        className="flex-row items-center px-5"
        style={({ pressed }) => ({
          paddingVertical: 20,
          gap: 16,
          backgroundColor: pressed && onPress ? theme.cardPressed : 'transparent',
        })}
      >
        <Avatar url={avatarUrl} name={name} size={38} />
        <View className="flex-1" style={{ gap: 3, marginLeft: 8 }}>
          <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '700' }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ color: theme.textTertiary, fontSize: 12.5 }} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        {outcome ? (
          <Pill theme={theme} tone={tone}>
            {outcome}
          </Pill>
        ) : null}
      </Pressable>
    </View>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const period = h < 12 ? 'AM' : 'PM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${period}`;
}
