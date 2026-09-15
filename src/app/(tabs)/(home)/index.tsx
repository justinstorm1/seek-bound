import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { api } from '../../../../convex/_generated/api';
import { FadeInView, Skeleton } from '../../../components/anim';
import { Avatar } from '../../../components/gameUi';
import { ArrowRight, ChevronRight, Plus, QrCode, Users } from '../../../components/icons';
import {
  Card,
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

export default function Home() {
  const { theme } = useTheme();
  const profile = useQuery(api.profiles.getMyProfile);
  const active = useQuery(api.games.getMyActiveGames);

  const winRate =
    profile && profile.gamesPlayed > 0
      ? `${Math.round((profile.gamesWon / profile.gamesPlayed) * 100)}%`
      : '—';

  return (
    <Screen title="Home">
      <FadeInView delay={0}>
        <Card theme={theme} className="p-4" onPress={() => router.push('/(tabs)/(profile)/profile')}>
          <View className="flex-row items-center gap-4">
            <Avatar
              url={profile?.avatarUrl ?? null}
              name={profile?.displayName ?? 'You'}
              size={54}
              ring
              ringColor={theme.primary}
            />
            <View className="flex-1">
              <Text style={{ color: theme.textTertiary, fontSize: 12.5, fontWeight: '600' }}>
                Welcome back
              </Text>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }} numberOfLines={1}>
                {profile?.displayName ?? 'player'}
              </Text>
            </View>
            <View className="items-end">
              <Text style={{ color: theme.primary, fontSize: 18, fontWeight: '800' }}>{winRate}</Text>
              <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '600' }}>
                win rate
              </Text>
            </View>
          </View>
          <View
            className="flex-row mt-4 pt-3"
            style={{ borderTopWidth: 1, borderColor: theme.divider }}
          >
            <MiniStat theme={theme} label="Played" value={profile?.gamesPlayed ?? 0} />
            <View style={{ width: 1, backgroundColor: theme.divider }} />
            <MiniStat theme={theme} label="Won" value={profile?.gamesWon ?? 0} />
            <View style={{ width: 1, backgroundColor: theme.divider }} />
            <MiniStat
              theme={theme}
              label="Active"
              value={active?.length ?? 0}
            />
          </View>
        </Card>
      </FadeInView>

      {active === undefined ? (
        <Skeleton color={theme.surfaceSecondary} height={78} radius={24} />
      ) : active.length > 0 ? (
        <FadeInView delay={80}>
          <View className="gap-2.5">
            <SectionLabel theme={theme}>Continue playing</SectionLabel>
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
                      style={{ color: theme.text, fontSize: 20, fontWeight: '800', letterSpacing: 3 }}
                    >
                      {g.code}
                    </Text>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      {g.status === 'active' ? (
                        <View className="flex-row items-center" style={{ gap: 5 }}>
                          <LiveDot color={theme.success} />
                          <Text
                            style={{ color: theme.success, fontSize: 12, fontWeight: '700' }}
                          >
                            {STATUS_LABEL[g.status]}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ color: theme.textTertiary, fontSize: 12, fontWeight: '600' }}>
                          {STATUS_LABEL[g.status] ?? g.status}
                        </Text>
                      )}
                      {g.role !== 'unassigned' ? (
                        <Pill theme={theme} tone={g.role === 'seeker' ? 'red' : 'green'}>
                          {roleLabel(g.role)}
                        </Pill>
                      ) : null}
                      <Text style={{ color: theme.textTertiary, fontSize: 12 }}>
                        · {g.playerCount} players
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color={theme.textTertiary} />
                </View>
              </Card>
            ))}
          </View>
        </FadeInView>
      ) : null}

      <FadeInView delay={160}>
        <View className="gap-2.5">
          <SectionLabel theme={theme}>Start a round</SectionLabel>
          <Card theme={theme} tone="primary" className="p-5" onPress={() => router.push('/createGame')}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3 gap-1.5">
                <Text style={{ color: theme.textOnPrimary, fontSize: 22, fontWeight: '800' }}>
                  Host a game
                </Text>
                <Text style={{ color: theme.textOnPrimary, opacity: 0.9, fontSize: 13.5, lineHeight: 19 }}>
                  Set the play area and rules, then invite with a code or QR.
                </Text>
              </View>
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 44, height: 44, backgroundColor: theme.surface }}
              >
                <Plus size={22} color={theme.primary} strokeWidth={2.6} />
              </View>
            </View>
          </Card>
        </View>
      </FadeInView>

      <FadeInView delay={240}>
        <View className="gap-2.5">
          <SectionLabel theme={theme}>Got an invite?</SectionLabel>
          <View className="flex-row gap-3">
            <JoinTile
              theme={theme}
              label="Enter code"
              icon={<ArrowRight size={20} color={theme.blue} />}
              onPress={() => router.push('/join')}
            />
            <JoinTile
              theme={theme}
              label="Scan QR"
              icon={<QrCode size={20} color={theme.blue} />}
              onPress={() => router.push('/scan-join')}
            />
          </View>
        </View>
      </FadeInView>

      {active !== undefined && active.length === 0 && (profile?.gamesPlayed ?? 0) === 0 ? (
        <FadeInView delay={320}>
          <View className="flex-row items-center gap-2.5 px-1 mt-1">
            <Users size={16} color={theme.textTertiary} />
            <Text style={{ color: theme.textTertiary, fontSize: 13, flex: 1 }}>
              New here? Host a game and share the code with friends nearby.
            </Text>
          </View>
        </FadeInView>
      ) : null}
    </Screen>
  );
}

function MiniStat({
  theme,
  label,
  value,
}: {
  theme: ThemeColors;
  label: string;
  value: number;
}) {
  return (
    <View className="flex-1 items-center gap-0.5">
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function JoinTile({
  theme,
  label,
  icon,
  onPress,
}: {
  theme: ThemeColors;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Card theme={theme} tone="blue" className="flex-1 p-4 items-center gap-2" onPress={onPress}>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 40, height: 40, backgroundColor: theme.surface }}
      >
        {icon}
      </View>
      <Text style={{ color: theme.blueDark, fontSize: 14, fontWeight: '700' }}>{label}</Text>
    </Card>
  );
}
