import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../convex/_generated/api';
import { Skeleton } from '../components/anim';
import { Avatar } from '../components/gameUi';
import {
  Divider,
  EmptyState,
  Screen,
  Segmented,
  useTheme,
  type ThemeColors,
} from '../components/ui';

type Scope = 'global' | 'following';

export default function Leaderboard() {
  const { theme } = useTheme();
  const [scope, setScope] = useState<Scope>('global');
  const globalRows = useQuery(api.leaderboard.global, scope === 'global' ? { limit: 50 } : 'skip');
  const followingRows = useQuery(api.leaderboard.following, scope === 'following' ? {} : 'skip');
  const rows = scope === 'global' ? globalRows : followingRows;
  const myProfile = useQuery(api.profiles.getMyProfile);

  return (
    <Screen title="Leaderboard">
      <Segmented
        theme={theme}
        value={scope}
        onChange={setScope}
        options={[
          { label: 'Global', value: 'global' },
          { label: 'Following', value: 'following' },
        ]}
      />

      {rows === undefined ? (
        <View className="gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} color={theme.surfaceSecondary} height={68} radius={18} />
          ))}
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          theme={theme}
          title={scope === 'following' ? 'Not following anyone yet' : 'No players yet'}
          message={
            scope === 'following'
              ? 'Follow players from a game or the leaderboard to see them here.'
              : 'Play a game to get on the board.'
          }
        />
      ) : (
        <View className="gap-2">
          {rows.map((r, i) => (
            <View key={r.userId}>
              {i > 0 ? <View style={{ marginBottom: 8 }}><Divider theme={theme} inset={0} /></View> : null}
              <Row
                theme={theme}
                rank={i + 1}
                name={r.displayName}
                avatarUrl={r.avatarUrl}
                level={r.level}
                xp={r.xp}
                isMe={r.userId === myProfile?.userId}
                onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: r.userId } })}
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Row({
  theme,
  rank,
  name,
  avatarUrl,
  level,
  xp,
  isMe,
  onPress,
}: {
  theme: ThemeColors;
  rank: number;
  name: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  isMe: boolean;
  onPress: () => void;
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.cardPressed }}
      className="flex-row items-center"
      style={({ pressed }) => ({
        paddingVertical: 20,
        paddingHorizontal: 8,
        borderRadius: 16,
        gap: 22,
        backgroundColor: isMe ? theme.primaryLight : pressed ? theme.cardPressed : 'transparent',
      })}
    >
      <Text
        style={{ width: 32, textAlign: 'center', color: theme.textSecondary, fontSize: 16, fontWeight: '800' }}
      >
        {medal ?? rank}
      </Text>
      <Avatar url={avatarUrl} name={name} size={46} />
      <View className="flex-1" style={{ gap: 4, marginLeft: 10 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
          {name}
          {isMe ? '  (you)' : ''}
        </Text>
        <Text style={{ color: theme.textTertiary, fontSize: 13 }}>Level {level}</Text>
      </View>
      <Text style={{ color: theme.primary, fontSize: 14.5, fontWeight: '800' }}>{xp} XP</Text>
    </Pressable>
  );
}
