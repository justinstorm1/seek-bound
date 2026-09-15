import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { QrScanner } from '../../../components/QrScanner';
import { parseQrToken } from '../../../lib/qr';

export default function Scan() {
  const { gameId } = useLocalSearchParams<{ gameId: Id<'games'> }>();
  const catchHider = useMutation(api.games.catchHider);
  const [scanKey, setScanKey] = useState(0);

  const onScan = async (data: string) => {
    const token = parseQrToken(data);
    if (!token) {
      Alert.alert('Not a hider code', 'Scan a hider’s QR code to tag them.', [
        { text: 'OK', onPress: () => setScanKey((k) => k + 1) },
      ]);
      return;
    }
    try {
      const result = await catchHider({ gameId, token });
      if (result.alreadyFound) {
        Alert.alert('Already tagged', 'That hider is already out.', [
          { text: 'OK', onPress: () => setScanKey((k) => k + 1) },
        ]);
        return;
      }
      if (result.allFound) {
        // Last hider — the game is over, go straight to the results.
        router.replace({ pathname: '/game/[gameId]/results', params: { gameId } });
        return;
      }
      Alert.alert('Tagged!', `${result.hiderName} is out.`, [
        { text: 'Nice', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Could not tag', e instanceof Error ? e.message : 'Try again.', [
        { text: 'OK', onPress: () => setScanKey((k) => k + 1) },
      ]);
    }
  };

  return (
    <QrScanner
      scanKey={scanKey}
      onScan={onScan}
      title="Tag a hider"
      hint="Scan the hider’s QR code once you reach them."
    />
  );
}
