import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect, useState } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { Pulse } from './anim';

SplashScreen.preventAutoHideAsync().catch(() => {});

const ICON = require('@/assets/images/seekboundicon-rounded.png');
const GLOW = require('@/assets/images/logo-glow.png');
const GLOW_COLOR = '#4FF23C';

/** Minimum time the branded splash stays up, so it never just flashes. */
const MIN_VISIBLE_MS = 1300;

/**
 * Holds a branded overlay (icon + neon glow, matching the native splash) over
 * the app until `ready` is true and a short minimum has elapsed, then hides the
 * native splash and fades the overlay out.
 */
export function SplashGate({ ready, children }: { ready: boolean; children: ReactNode }) {
  const isDark = useColorScheme() === 'dark';
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  const done = ready && minElapsed;

  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => {});
  }, [done]);

  const background = isDark ? '#07120D' : '#0A3D16';

  return (
    <View style={{ flex: 1 }}>
      {children}
      {!done ? (
        <Animated.View
          exiting={FadeOut.duration(420)}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: background }]}
        >
          <View style={styles.stage}>
            <Pulse min={0.94} max={1.1} duration={2200} style={styles.glow}>
              <Image
                source={GLOW}
                tintColor={GLOW_COLOR}
                style={{ width: 360, height: 360, opacity: 0.7 }}
                contentFit="contain"
              />
            </Pulse>
            <Image source={ICON} style={styles.icon} contentFit="contain" />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center' },
  stage: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  icon: { width: 220, height: 220 },
});
