import { useAuthActions } from '@convex-dev/auth/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  useColorScheme,
  View
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkColors, lightColors } from '../../../utils/theme';
import { FadeInView, PressableScale, Pulse } from '../../components/anim';
import { MapPin, QrCode, Users } from '../../components/icons';

type Theme = Record<keyof typeof lightColors, string>;

WebBrowser.maybeCompleteAuthSession();

type OAuthProvider = 'apple' | 'google';

const ICON = require('@/assets/images/seekboundicon.png');
const GLOW = require('@/assets/images/logo-glow.png');
const GOOGLE_ICON = require('@/assets/images/googleicon.webp');

/** The neon-green boundary ring from the app icon. */
const GLOW_COLOR = '#4FF23C';

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? darkColors : lightColors;

  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const isSigningIn = pending !== null;

  const { signIn } = useAuthActions();

  const signInWithOAuth = async (provider: OAuthProvider) => {
    if (isSigningIn) return;
    setPending(provider);
    try {
      const redirectTo = makeRedirectUri();

      const { redirect } = await signIn(provider, { redirectTo });
      if (!redirect) return;

      const result = await WebBrowser.openAuthSessionAsync(redirect.toString(), redirectTo);
      if (result.type !== 'success') {
        // User dismissed the browser — nothing to report.
        return;
      }

      const params = new URL(result.url).searchParams;
      const error = params.get('error_description') ?? params.get('error');
      const code = params.get('code');
      if (error) {
        Alert.alert('Sign-in failed', decodeURIComponent(error.replace(/\+/g, ' ')));
        return;
      }
      if (!code) {
        Alert.alert('Sign-in failed', 'Use your @njit.edu Google account to sign in.');
        return;
      }

      await signIn(provider, { code });
    } catch (error) {
      console.error(`${provider} sign-in error:`, error);
    } finally {
      setPending(null);
    }
  };

  const handleNativeAppleSignIn = async () => {
    if (isSigningIn) return;
    setPending('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        console.warn('Apple sign-in returned no identity token');
        return;
      }
      // `fullName` is only provided on the very first authorization for this app.
      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
            .trim()
        : '';
      const args: Record<string, string> = { identityToken: credential.identityToken };
      if (fullName) args.fullName = fullName;
      await signIn('apple-native', args);
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      console.error('Apple native sign-in error:', error);
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        className="flex-1"
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 12,
          backgroundColor: theme.background,
        }}
      >
        <Blob color={theme.primary} size={340} startX={-120} startY={-40} drift={26} delay={0} />
        <Blob color={theme.seeker} size={300} startX={220} startY={120} drift={-34} delay={800} />
        <Blob color={theme.blue} size={260} startX={40} startY={520} drift={22} delay={1600} />

        <View className="flex-1 items-center justify-center px-8">
          <View className="items-center justify-center" style={{ width: 260, height: 260 }}>
            <Pulse
              min={0.96}
              max={1.08}
              duration={2600}
              style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}
            >
              <Image
                source={GLOW}
                tintColor={GLOW_COLOR}
                style={{ width: 320, height: 320, opacity: isDark ? 0.65 : 0.85 }}
                contentFit="contain"
              />
            </Pulse>
            <Animated.View
              entering={FadeInDown.duration(650).springify().damping(14).mass(0.9)}
              style={{
                shadowColor: GLOW_COLOR,
                shadowOpacity: 0.5,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 12 },
              }}
            >
              <Image
                source={ICON}
                style={{ width: 116, height: 116, borderRadius: 30 }}
                contentFit="cover"
              />
            </Animated.View>
          </View>

          <FadeInView delay={220}>
            <Text
              className="text-center font-extrabold"
              style={{ color: theme.text, fontSize: 38, letterSpacing: -0.5, marginTop: 28 }}
            >
              SeekBound
            </Text>
          </FadeInView>
          <FadeInView delay={320}>
            <Text
              className="text-center"
              style={{ color: theme.textSecondary, fontSize: 16, marginTop: 8 }}
            >
              Hunt your friends across the map.{'\n'}Or vanish before they find you.
            </Text>
          </FadeInView>

          <FadeInView delay={400}>
            <View className="flex-row items-center justify-center" style={{ gap: 18, marginTop: 24 }}>
              <Feature theme={theme} icon={<MapPin size={17} color={theme.primary} />} label="Live map" />
              <View style={{ width: 1, height: 16, backgroundColor: theme.border }} />
              <Feature theme={theme} icon={<QrCode size={17} color={theme.primary} />} label="QR tag" />
              <View style={{ width: 1, height: 16, backgroundColor: theme.border }} />
              <Feature theme={theme} icon={<Users size={17} color={theme.primary} />} label="2–64 players" />
            </View>
          </FadeInView>
        </View>

        <View className="px-6 gap-3">
          {/* <FadeInView delay={480}>
            <OAuthButton
              label="Continue with Apple"
              onPress={Platform.OS === 'ios' ? () => handleNativeAppleSignIn() : () => signInWithOAuth('apple')}
              disabled={isSigningIn}
              loading={pending === 'apple'}
              backgroundColor={isDark ? theme.white : theme.black}
              color={isDark ? theme.black : theme.white}
              glyph={Platform.OS === 'ios' ? '' : undefined}
            />
          </FadeInView> */}
          <FadeInView delay={560}>
            <OAuthButton
              label="Login with NJIT"
              onPress={() => signInWithOAuth('google')}
              disabled={isSigningIn}
              loading={pending === 'google'}
              backgroundColor={theme.surface}
              color={theme.text}
              borderColor={theme.border}
              iconSource={GOOGLE_ICON}
            />
          </FadeInView>
          <Animated.Text
            entering={FadeIn.delay(720).duration(500)}
            className="text-center"
            style={{ color: theme.textTertiary, fontSize: 12, marginTop: 4 }}
          >
            Sign in with your @njit.edu Google account. Location is used only during a live game.
          </Animated.Text>
        </View>
      </View>
    </>
  );
}

function OAuthButton({
  label,
  onPress,
  disabled,
  loading,
  backgroundColor,
  color,
  borderColor,
  glyph,
  iconSource,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  backgroundColor: string;
  color: string;
  borderColor?: string;
  glyph?: string;
  iconSource?: number;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      className="w-full flex-row items-center justify-center rounded-full"
      style={{
        backgroundColor,
        borderWidth: borderColor ? 1 : 0,
        borderColor,
        paddingVertical: 16,
        opacity: disabled && !loading ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View className="flex-row items-center justify-center" style={{ gap: 10 }}>
          {glyph ? (
            <Text style={{ color, fontSize: 18, marginTop: -2 }}>{glyph}</Text>
          ) : null}
          {iconSource ? (
            <Image source={iconSource} style={{ width: 18, height: 18 }} contentFit="contain" />
          ) : null}
          <Text className="font-semibold" style={{ color, fontSize: 16 }}>
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

function Feature({
  theme,
  icon,
  label,
}: {
  theme: Theme;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <View className="items-center" style={{ gap: 5 }}>
      {icon}
      <Text style={{ color: theme.textTertiary, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

/** Slow, looping ambient orb drifting behind the content. */
function Blob({
  color,
  size,
  startX,
  startY,
  drift,
  delay,
}: {
  color: string;
  size: number;
  startX: number;
  startY: number;
  drift: number;
  delay: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: startX + t.value * drift },
      { translateY: startY + t.value * drift * 1.4 },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.12,
        },
        style,
      ]}
    />
  );
}
