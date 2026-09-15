import { useAuthActions } from '@convex-dev/auth/react';
import { useMutation, useQuery } from 'convex/react';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { api } from '../../../../convex/_generated/api';
import { Button } from '../../../components/Button';
import { Avatar, StatCard } from '../../../components/gameUi';
import { Bolt, Camera, Pencil, SignOut, Trash, Trophy, Users } from '../../../components/icons';
import { AchievementGrid, XpBar } from '../../../components/progressUi';
import {
  Card,
  CenteredLoader,
  Divider,
  ListRow,
  Screen,
  SectionLabel,
  TextField,
  useTheme,
} from '../../../components/ui';
import { useAvatarUpload } from '../../../lib/useAvatarUpload';

export default function Profile() {
  const { theme } = useTheme();
  const { signOut } = useAuthActions();
  const profile = useQuery(api.profiles.getMyProfile);
  const isAdmin = useQuery(api.push.amIAdmin);
  const myAchievements = useQuery(api.achievements.mine);
  const following = useQuery(api.social.myFollowing);
  const followers = useQuery(api.social.myFollowers);
  const upsertProfile = useMutation(api.profiles.upsertProfile);
  const deleteMyAccount = useMutation(api.account.deleteMyAccount);
  const { pickAndUpload, busy: uploading } = useAvatarUpload();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error('Error signing out:', error);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, photo, stats and game history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteMyAccount();
              await signOut().catch(() => {});
              // _layout sees `isAuthenticated` flip and routes to sign-in.
            } catch {
              setDeleting(false);
              Alert.alert('Could not delete account', 'Please try again in a moment.');
            }
          },
        },
      ],
    );
  };

  const changeAvatar = async () => {
    if (!profile) return;
    const result = await pickAndUpload();
    if (!result) return;
    setPendingAvatarUri(result.localUri);
    try {
      await upsertProfile({ displayName: profile.displayName, avatarStorageId: result.storageId });
    } catch {
      setPendingAvatarUri(null);
      Alert.alert('Could not update photo', 'Please try again.');
    }
  };

  const saveName = async () => {
    if (name.trim().length < 2) return;
    try {
      setBusy(true);
      await upsertProfile({ displayName: name.trim() });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (profile === undefined) return <CenteredLoader />;

  const winRate =
    profile && profile.gamesPlayed > 0
      ? `${Math.round((profile.gamesWon / profile.gamesPlayed) * 100)}%`
      : '—';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen title="Profile" keyboardAware>
      <Card theme={theme} className="items-center px-6 py-7 gap-4">
        <Pressable onPress={changeAvatar} disabled={uploading}>
          <View>
            {pendingAvatarUri ? (
              <Image
                source={{ uri: pendingAvatarUri }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
              />
            ) : (
              <Avatar
                url={profile?.avatarUrl ?? null}
                name={profile?.displayName ?? 'You'}
                size={96}
                ring
                ringColor={theme.primary}
              />
            )}
            <View
              className="absolute items-center justify-center rounded-full"
              style={{
                bottom: -2,
                right: -2,
                width: 32,
                height: 32,
                backgroundColor: theme.primary,
                borderWidth: 3,
                borderColor: theme.surface,
              }}
            >
              <Camera size={15} color={theme.textOnPrimary} strokeWidth={2.4} />
            </View>
          </View>
        </Pressable>

        {editing ? (
          <View className="w-full gap-3">
            <TextField
              theme={theme}
              value={name}
              onChangeText={setName}
              placeholder="Display name"
              autoFocus
              maxLength={40}
              style={{ textAlign: 'center', fontWeight: '700', fontSize: 18 }}
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="Save" onPress={saveName} loading={busy} size="md" />
              </View>
              <View className="flex-1">
                <Button label="Cancel" variant="tonal" size="md" onPress={() => setEditing(false)} />
              </View>
            </View>
          </View>
        ) : (
          <View className="items-center gap-2">
            <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800' }}>
              {profile?.displayName ?? 'Player'}
            </Text>
            <Pressable
              hitSlop={8}
              className="flex-row items-center gap-1.5 rounded-full"
              style={{ backgroundColor: theme.surfaceSecondary, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={() => {
                setName(profile?.displayName ?? '');
                setEditing(true);
              }}
            >
              <Pencil size={13} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>
                Edit name
              </Text>
            </Pressable>
          </View>
        )}
      </Card>

      {profile ? (
        <Card theme={theme} className="p-4 gap-3">
          <XpBar
            theme={theme}
            level={profile.level}
            xpIntoLevel={profile.xpIntoLevel}
            xpForNextLevel={profile.xpForNextLevel}
          />
          <View className="flex-row items-center gap-2 pt-2" style={{ borderTopWidth: 1, borderColor: theme.divider }}>
            <Users size={14} color={theme.textTertiary} />
            <Text style={{ color: theme.textSecondary, fontSize: 12.5 }}>
              {followers?.length ?? 0} followers · {following?.length ?? 0} following
            </Text>
          </View>
        </Card>
      ) : null}

      <SectionLabel theme={theme}>Stats</SectionLabel>
      <View className="flex-row gap-3">
        <StatCard label="Played" value={String(profile?.gamesPlayed ?? 0)} />
        <StatCard label="Won" value={String(profile?.gamesWon ?? 0)} tint={theme.primary} />
        <StatCard label="Win rate" value={winRate} />
      </View>
      <View className="flex-row gap-3">
        <StatCard label="As hider" value={`${profile?.hiderWins ?? 0}/${profile?.gamesAsHider ?? 0}`} />
        <StatCard label="As seeker" value={`${profile?.seekerWins ?? 0}/${profile?.gamesAsSeeker ?? 0}`} />
        <StatCard label="Catches" value={String(profile?.totalCatches ?? 0)} />
      </View>

      <SectionLabel theme={theme}>Achievements</SectionLabel>
      <Card theme={theme} className="p-4">
        <AchievementGrid theme={theme} unlocked={(myAchievements ?? []).map((a) => a.key)} />
      </Card>

      <Card theme={theme}>
        <ListRow
          theme={theme}
          icon={<Trophy size={17} color={theme.primary} />}
          title="Leaderboard"
          onPress={() => router.push('/leaderboard')}
        />
        {isAdmin ? (
          <>
            <Divider theme={theme} inset={16} />
            <ListRow
              theme={theme}
              icon={<Bolt size={17} color={theme.primary} />}
              title="Send announcement"
              onPress={() => router.push('/admin-broadcast')}
            />
          </>
        ) : null}
      </Card>

      <SectionLabel theme={theme}>Account</SectionLabel>
      <Card theme={theme}>
        <ListRow
          theme={theme}
          icon={<SignOut size={17} color={theme.text} />}
          title="Sign out"
          onPress={handleSignOut}
          right={null}
        />
        <Divider theme={theme} inset={16} />
        <ListRow
          theme={theme}
          icon={<Trash size={17} color={theme.danger} />}
          title={deleting ? 'Deleting account…' : 'Delete account'}
          subtitle="Permanently removes your data"
          danger
          onPress={deleting ? undefined : handleDeleteAccount}
          right={null}
        />
      </Card>

      <Text
        className="text-center"
        style={{ color: theme.textQuaternary, fontSize: 12, marginTop: 4 }}
      >
        SeekBound v{version}
      </Text>
    </Screen>
  );
}
