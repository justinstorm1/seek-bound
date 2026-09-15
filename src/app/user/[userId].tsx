import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Skeleton } from '../../components/anim';
import { Button } from '../../components/Button';
import { Avatar, StatCard } from '../../components/gameUi';
import { AchievementGrid, XpBar } from '../../components/progressUi';
import { Card, Screen, SectionLabel, useTheme, type ThemeColors } from '../../components/ui';

export default function UserProfile() {
  const { userId } = useLocalSearchParams<{ userId: Id<'users'> }>();
  const { theme } = useTheme();
  const profile = useQuery(api.social.getPublicProfile, { userId });
  const achievements = useQuery(api.achievements.forUser, { userId });
  const follow = useMutation(api.social.follow);
  const unfollow = useMutation(api.social.unfollow);

  if (profile === undefined) {
    return (
      <Screen title="">
        <ProfileSkeleton theme={theme} />
      </Screen>
    );
  }
  if (profile === null) {
    return (
      <Screen title="">
        <Text style={{ color: theme.text }}>This player no longer exists.</Text>
      </Screen>
    );
  }

  const s = profile.stats;
  const winRate =
    s.gamesPlayed > 0 ? `${Math.round((s.gamesWon / s.gamesPlayed) * 100)}%` : '—';
  const toggleFollow = () => {
    if (profile.isFollowing) void unfollow({ userId }).catch(() => {});
    else void follow({ userId }).catch(() => {});
  };

  return (
    <Screen title="">
      <Card theme={theme} className="items-center px-6 py-7 gap-4">
        <Avatar
          url={profile.avatarUrl}
          name={profile.displayName}
          size={92}
          ring
          ringColor={theme.primary}
        />
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>
          {profile.displayName}
        </Text>
        <View className="flex-row" style={{ gap: 24 }}>
          <Count theme={theme} label="Followers" value={profile.followers} />
          <Count theme={theme} label="Following" value={profile.following} />
        </View>
        {!profile.isMe ? (
          <View className="w-full">
            <Button
              label={profile.isFollowing ? 'Following' : 'Follow'}
              variant={profile.isFollowing ? 'tonal' : 'primary'}
              size="md"
              onPress={toggleFollow}
            />
          </View>
        ) : null}
      </Card>

      <Card theme={theme} className="p-4">
        <XpBar
          theme={theme}
          level={profile.level}
          xpIntoLevel={profile.xpIntoLevel}
          xpForNextLevel={profile.xpForNextLevel}
        />
      </Card>

      <SectionLabel theme={theme}>Stats</SectionLabel>
      <View className="flex-row gap-3">
        <StatCard label="Played" value={String(s.gamesPlayed)} />
        <StatCard label="Won" value={String(s.gamesWon)} tint={theme.primary} />
        <StatCard label="Win rate" value={winRate} />
      </View>
      <View className="flex-row gap-3">
        <StatCard label="As hider" value={`${s.hiderWins}/${s.gamesAsHider}`} />
        <StatCard label="As seeker" value={`${s.seekerWins}/${s.gamesAsSeeker}`} />
        <StatCard label="Catches" value={String(s.totalCatches)} />
      </View>

      <SectionLabel theme={theme}>Achievements</SectionLabel>
      <Card theme={theme} className="p-4">
        <AchievementGrid theme={theme} unlocked={(achievements ?? []).map((a) => a.key)} />
      </Card>
    </Screen>
  );
}

function Count({
  theme,
  label,
  value,
}: {
  theme: ThemeColors;
  label: string;
  value: number;
}) {
  return (
    <View className="items-center">
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: theme.textTertiary, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function ProfileSkeleton({ theme }: { theme: ThemeColors }) {
  const c = theme.surfaceSecondary;
  return (
    <View className="gap-4">
      <Card theme={theme} className="items-center px-6 py-7 gap-4">
        <Skeleton color={c} width={92} height={92} radius={46} />
        <Skeleton color={c} width={140} height={20} radius={6} />
        <Skeleton color={c} width={180} height={14} radius={6} />
        <Skeleton color={c} width="100%" height={44} radius={22} />
      </Card>
      <Card theme={theme} className="p-4">
        <Skeleton color={c} height={40} radius={8} />
      </Card>
      <View className="flex-row gap-3">
        {[0, 1, 2].map((i) => (
          <View key={i} className="flex-1">
            <Skeleton color={c} height={64} radius={16} />
          </View>
        ))}
      </View>
    </View>
  );
}
