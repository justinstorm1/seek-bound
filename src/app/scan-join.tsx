import { useMutation } from 'convex/react';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../../convex/_generated/api';
import { QrScanner } from '../components/QrScanner';
import { parseJoinQr } from '../lib/qr';

export default function ScanJoin() {
  const joinByCode = useMutation(api.games.joinByCode);
  const [scanKey, setScanKey] = useState(0);

  const onScan = async (data: string) => {
    const code = parseJoinQr(data);
    if (!code) {
      Alert.alert('Not a game code', 'That QR code is not a Hide & Seek invite.', [
        { text: 'OK', onPress: () => setScanKey((k) => k + 1) },
      ]);
      return;
    }
    try {
      const { gameId } = await joinByCode({ code });
      router.replace({ pathname: '/game/[gameId]/lobby', params: { gameId } });
    } catch (e) {
      Alert.alert('Could not join', e instanceof Error ? e.message : 'Try again.', [
        { text: 'OK', onPress: () => setScanKey((k) => k + 1) },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <QrScanner
        scanKey={scanKey}
        onScan={onScan}
        title="Scan to join"
        hint="Point at the host's lobby QR code."
      />
    </>
  );
}
