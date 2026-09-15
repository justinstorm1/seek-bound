import { usePaginatedQuery, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../../../convex/_generated/api';
import { FadeInView, Skeleton } from '../../../components/anim';
import { ChevronRight, Flag, Trophy } from '../../../components/icons';
import {
  Card,
  EmptyState,
  ListRow,
  LiveDot,
  Pill,
  Screen,
  SectionLabel,
  useTheme,
  type ThemeColors,
} from '../../../components/ui';
import { roleLabel } from '../../../lib/game';

const STATUS_LABEL: Record<string, string> = {
  lobby: 'In lobby',
  starting: 'Starting',
  active: 'Live now',
};

export default function Games() {
  const { theme } = useTheme();
  const active = useQuery(api.games.getMyActiveGames);
  const history = usePaginatedQuery(api.games.myHistory, {}, { initialNumItems: 20 });

  const finished = history.results;
  const wins = finished.filter((g) => g.won).length;

  return (
    <Screen title="Games">
      <Card theme={theme}>
        <ListRow
          theme={theme}
          icon={<Trophy size={17} color={theme.primary} />}
          title="Leaderboard"
          subtitle="Global & players you follow"
          onPress={() => router.push('/leaderboard')}
        />
      </Card>

      {finished.length > 0 ? (
        <FadeInView>
          <Card theme={theme} className="flex-row p-4">
            <Tally theme={theme} label="Played" value={finished.length} />
            <View style={{ width: 1, backgroundColor: theme.divider }} />
            <Tally theme={theme} label="Won" value={wins} tint={theme.primary} />
            <View style={{ width: 1, backgroundColor: theme.divider }} />
            <Tally
              theme={theme}
              label="Win rate"
              value={`${Math.round((wins / finished.length) * 100)}%`}
            />
          </Card>
        </FadeInView>
      ) : null}

      <View className="gap-2.5">
        <SectionLabel theme={theme}>In progress</SectionLabel>
        {active === undefined ? (
          <Skeleton color={theme.surfaceSecondary} height={72} radius={24} />
        ) : active.length === 0 ? (
          <Card theme={theme}>
            <EmptyState
              theme={theme}
              title="No games in progress"
              message="Host a game or join with a code to get started."
              action={{ label: 'Host a game', onPress: () => router.push('/createGame') }}
            />
          </Card>
        ) : (
          <View className="gap-2.5">
            {active.map((g) => (
              <Card
                key={g.gameId}
                theme={theme}
                className="p-4"
                onPress={() =>
                  router.push({ pathname: '/game/[gameId]', params: { gameId: g.gameId } })
                }
              >
                <View className="flex-row items-center gap-3">
                  <View className="flex-1 gap-1.5">
                    <Text
                      style={{ color: theme.text, fontSize: 19, fontWeight: '800', letterSpacing: 3 }}
                    >
                      {g.code}
                    </Text>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      {g.status === 'active' ? (
                        <View className="flex-row items-center" style={{ gap: 5 }}>
                          <LiveDot color={theme.success} />
                          <Text style={{ color: theme.success, fontSize: 12, fontWeight: '700' }}>
                            {STATUS_LABEL[g.status]}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ color: theme.textTertiary, fontSize: 12, fontWeight: '600' }}>
                          {STATUS_LABEL[g.status] ?? g.status}
                        </Text>
                      )}
                      <Text style={{ color: theme.textTertiary, fontSize: 12 }}>
                        · {g.playerCount} players
                      </Text>
                    </View>
                  </View>
                  {g.role !== 'unassigned' ? (
                    <Pill theme={theme} tone={g.role === 'seeker' ? 'red' : 'green'}>
                      {roleLabel(g.role)}
                    </Pill>
                  ) : null}
                  <ChevronRight size={18} color={theme.textTertiary} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      <View className="gap-2.5">
        <SectionLabel theme={theme}>History</SectionLabel>
        {history.isLoading && finished.length === 0 ? (
          <View className="gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} color={theme.surfaceSecondary} height={64} radius={20} />
            ))}
          </View>
        ) : finished.length === 0 ? (
          <Card theme={theme}>
            <EmptyState theme={theme} title="No finished games yet" message="Play a round and it shows up here." />
          </Card>
        ) : (
          <Card theme={theme}>
            {finished.map((g, i) => (
              <View key={g.gameId}>
                {i > 0 ? <View style={{ height: 1, marginLeft: 62, backgroundColor: theme.divider }} /> : null}
                <View className="flex-row items-center gap-3 px-4" style={{ paddingVertical: 13 }}>
                  <View
                    className="items-center justify-center rounded-xl"
                    style={{
                      width: 34,
                      height: 34,
                      backgroundColor: g.won ? theme.successLight : theme.surfaceSecondary,
                    }}
                  >
                    {g.won ? (
                      <Trophy size={17} color={theme.successDark} />
                    ) : (
                      <Flag size={17} color={theme.textTertiary} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: theme.text, fontSize: 14.5, fontWeight: '700' }}>
                      {g.winner === 'hiders' ? 'Hiders won' : g.winner === 'seekers' ? 'Seekers won' : 'Finished'}
                    </Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 12.5, marginTop: 1 }}>
                      {formatDate(g.endedAt)} · as {roleLabel(g.role)}
                    </Text>
                  </View>
                  <Pill theme={theme} tone={g.won ? 'green' : 'neutral'}>
                    {g.won ? 'Won' : 'Lost'}
                  </Pill>
                </View>
              </View>
            ))}
            {history.status === 'CanLoadMore' ? (
              <Pressable
                className="items-center"
                style={{ paddingVertical: 13, borderTopWidth: 1, borderColor: theme.divider }}
                onPress={() => history.loadMore(20)}
              >
                <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '700' }}>
                  Load more
                </Text>
              </Pressable>
            ) : null}
          </Card>
        )}
      </View>
    </Screen>
  );
}

function Tally({
  theme,
  label,
  value,
  tint,
}: {
  theme: ThemeColors;
  label: string;
  value: string | number;
  tint?: string;
}) {
  return (
    <View className="flex-1 items-center gap-1">
      <Text style={{ color: tint ?? theme.text, fontSize: 20, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
