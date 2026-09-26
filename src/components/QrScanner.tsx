import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Camera, Torch, X } from './icons';
import { useTheme } from './ui';

const FRAME = 248;

type Props = {
  onScan: (data: string) => void | Promise<void>;
  title: string;
  hint: string;
  /** Re-arm the scanner after a handled scan (e.g. an invalid code). */
  scanKey?: number;
};

export function QrScanner({ onScan, title, hint, scanKey = 0 }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const handledFor = useRef(-1);

  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [sweep]);
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * (FRAME - 8) }],
    opacity: 0.35 + sweep.value * 0.4,
  }));

  if (!permission) {
    return <View className="flex-1" style={{ backgroundColor: '#000' }} />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <Pressable
          onPress={() => router.back()}
          className="absolute items-center justify-center rounded-full"
          style={{
            top: insets.top + 12,
            left: 16,
            width: 40,
            height: 40,
            backgroundColor: theme.surfaceSecondary,
          }}
        >
          <X size={20} color={theme.text} />
        </Pressable>

        <View className="flex-1 items-center justify-center px-8 gap-4">
          <View
            className="items-center justify-center rounded-3xl"
            style={{ width: 64, height: 64, backgroundColor: theme.surfaceSecondary }}
          >
            <Camera size={26} color={theme.textSecondary} />
          </View>
          <Text className="text-xl font-bold text-center" style={{ color: theme.text }}>
            Camera access needed
          </Text>
          <Text className="text-center" style={{ color: theme.textSecondary }}>
            {hint}
          </Text>
          <Text className="text-center" style={{ color: theme.textTertiary, fontSize: 12.5 }}>
            SeekBound only uses your camera to scan QR codes — nothing is ever recorded or stored.
          </Text>
          <Button label="Continue" onPress={requestPermission} />
          {permission.status === 'denied' ? (
            <Pressable onPress={() => Linking.openSettings()}>
              <Text className="text-center" style={{ color: theme.primary, fontWeight: '600' }}>
                Open SeekBound in Settings
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const handle = async (data: string) => {
    if (busy || handledFor.current === scanKey) return;
    handledFor.current = scanKey;
    try {
      setBusy(true);
      await onScan(data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(r) => void handle(r.data)}
      />

      {/* Dimmed surround with a clear square in the middle */}
      <View pointerEvents="none" className="absolute inset-0">
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />
        <View className="flex-row" style={{ height: FRAME }}>
          <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />
          <View style={{ width: FRAME, height: FRAME }}>
            <Corner style={{ top: 0, left: 0 }} borders={{ borderTopWidth: 3, borderLeftWidth: 3 }} />
            <Corner style={{ top: 0, right: 0 }} borders={{ borderTopWidth: 3, borderRightWidth: 3 }} />
            <Corner style={{ bottom: 0, left: 0 }} borders={{ borderBottomWidth: 3, borderLeftWidth: 3 }} />
            <Corner style={{ bottom: 0, right: 0 }} borders={{ borderBottomWidth: 3, borderRightWidth: 3 }} />
            <Animated.View
              style={[
                { position: 'absolute', left: 6, right: 6, height: 2, borderRadius: 2, backgroundColor: theme.primary },
                sweepStyle,
              ]}
            />
          </View>
          <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />
        </View>
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} />
      </View>

      {/* Header */}
      <View className="absolute left-0 right-0 items-center px-8 gap-2" style={{ top: insets.top + 12 }}>
        <View
          className="rounded-full"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text className="text-center" style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '800' }}>
            {title}
          </Text>
        </View>
        <Text className="text-center" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13.5 }}>
          {hint}
        </Text>
      </View>

      {/* Controls */}
      <View
        className="absolute left-0 right-0 flex-row items-center justify-center"
        style={{ bottom: insets.bottom + 24, gap: 14 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="items-center justify-center rounded-full"
          style={{ width: 52, height: 52, backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <X size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={() => setTorch((t) => !t)}
          className="items-center justify-center rounded-full"
          style={{ width: 52, height: 52, backgroundColor: torch ? theme.primary : 'rgba(0,0,0,0.55)' }}
        >
          <Torch size={22} color={torch ? theme.textOnPrimary : '#FFFFFF'} />
        </Pressable>
      </View>
    </View>
  );
}

function Corner({
  style,
  borders,
}: {
  style: object;
  borders: object;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        width: 26,
        height: 26,
        borderColor: '#FFFFFF',
        borderRadius: 4,
        ...style,
        ...borders,
      }}
    />
  );
}
