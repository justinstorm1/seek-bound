import { useMutation } from 'convex/react';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Button } from '../components/Button';
import { FadeInView } from '../components/anim';
import { Camera, Check } from '../components/icons';
import { Banner, TextField, useTheme } from '../components/ui';
import { useAvatarUpload } from '../lib/useAvatarUpload';

export default function ProfileSetup() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const upsertProfile = useMutation(api.profiles.upsertProfile);
  const { pickAndUpload, busy: uploading, error: uploadError } = useAvatarUpload();

  const [displayName, setDisplayName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarStorageId, setAvatarStorageId] = useState<Id<'_storage'> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = displayName.trim();
  const nameValid = trimmed.length >= 2;

  const pickAvatar = async () => {
    const result = await pickAndUpload();
    if (!result) return;
    setAvatarUri(result.localUri);
    setAvatarStorageId(result.storageId);
  };

  const save = async () => {
    setError(null);
    if (!nameValid) {
      setError('Pick a name with at least 2 characters.');
      return;
    }
    try {
      setSaving(true);
      await upsertProfile({
        displayName: trimmed,
        avatarStorageId: avatarStorageId ?? undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAwareScrollView
        bottomOffset={24}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView>
          <View className="gap-2 mb-8">
            <Text style={{ color: theme.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>
              Set up your profile
            </Text>
            <Text style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 21 }}>
              This is how other players see you in a game.
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={80}>
          <View className="items-center mb-8">
            <Pressable onPress={pickAvatar} disabled={uploading}>
              {avatarUri ? (
                <View>
                  <Image
                    source={{ uri: avatarUri }}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      borderWidth: 3,
                      borderColor: theme.primary,
                    }}
                  />
                  <View
                    className="absolute items-center justify-center rounded-full"
                    style={{
                      right: -2,
                      bottom: -2,
                      width: 34,
                      height: 34,
                      backgroundColor: theme.primary,
                      borderWidth: 3,
                      borderColor: theme.background,
                    }}
                  >
                    <Check size={16} color={theme.textOnPrimary} strokeWidth={3} />
                  </View>
                </View>
              ) : (
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 120,
                    height: 120,
                    backgroundColor: theme.primaryLight,
                    borderWidth: 2,
                    borderColor: theme.primary,
                    borderStyle: 'dashed',
                    gap: 6,
                  }}
                >
                  <Camera size={24} color={theme.primaryDark} />
                  <Text style={{ color: theme.primaryDark, fontSize: 12, fontWeight: '700' }}>
                    {uploading ? 'Uploading…' : 'Add photo'}
                  </Text>
                </View>
              )}
            </Pressable>
            <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 10 }}>
              Optional — you can change it later
            </Text>
          </View>
        </FadeInView>

        <FadeInView delay={160}>
          <View className="gap-2 mb-6">
            <View className="flex-row items-center justify-between">
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Display name</Text>
              <Text style={{ color: theme.textQuaternary, fontSize: 12 }}>{displayName.length}/40</Text>
            </View>
            <TextField
              theme={theme}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Alex"
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={save}
            />
          </View>
        </FadeInView>

        {error || uploadError ? (
          <View className="mb-4">
            <Banner theme={theme} tone="danger">
              {error ?? uploadError}
            </Banner>
          </View>
        ) : null}

        <FadeInView delay={240}>
          <Button label="Continue" onPress={save} loading={saving} disabled={!nameValid} />
        </FadeInView>
      </KeyboardAwareScrollView>
    </>
  );
}
