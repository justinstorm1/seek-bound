import { useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { ScaleIn } from '../../../components/anim';
import { Avatar } from '../../../components/gameUi';
import { Eye, Shield } from '../../../components/icons';
import { CenteredLoader, useTheme } from '../../../components/ui';
import { encodeTokenQr } from '../../../lib/qr';

export default function PlayerQr() {
  const { gameId } = useLocalSearchParams<{ gameId: Id<'games'> }>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const token = useQuery(api.games.myToken, { gameId });
  const profile = useQuery(api.profiles.getMyProfile);

  if (token === undefined) return <CenteredLoader />;

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: theme.background, paddingBottom: insets.bottom + 24, gap: 24 }}
    >
      <View className="items-center gap-2">
        <View className="flex-row items-center gap-2">
          <Shield size={18} color={theme.primary} />
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>Your tag code</Text>
        </View>
        <Text className="text-center" style={{ color: theme.textSecondary, fontSize: 14 }}>
          A seeker scans this to catch you.
        </Text>
      </View>

      <ScaleIn>
        <View
          className="rounded-[32px] items-center"
          style={{
            backgroundColor: theme.surface,
            borderWidth: 2,
            borderColor: theme.primary,
            padding: 24,
            gap: 18,
            shadowColor: theme.primary,
            shadowOpacity: 0.25,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
          }}
        >
          <View className="flex-row items-center gap-3 self-stretch">
            <Avatar url={profile?.avatarUrl ?? null} name={profile?.displayName ?? 'You'} size={40} />
            <View className="flex-1">
              <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                {profile?.displayName ?? 'You'}
              </Text>
              <Text style={{ color: theme.textTertiary, fontSize: 12 }}>Hider</Text>
            </View>
          </View>

          <View className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF' }}>
            {token ? (
              <QRCode value={encodeTokenQr(token)} size={224} backgroundColor="#FFFFFF" />
            ) : (
              <Text style={{ color: '#000000' }}>No code for this game.</Text>
            )}
          </View>
        </View>
      </ScaleIn>

      <View
        className="flex-row items-start rounded-2xl"
        style={{ backgroundColor: theme.warningLight, padding: 14, gap: 10 }}
      >
        <Eye size={16} color={theme.warningDark} />
        <Text className="flex-1" style={{ color: theme.warningDark, fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
          Keep this hidden. Only show it once a seeker has actually caught you.
        </Text>
      </View>
    </View>
  );
}
