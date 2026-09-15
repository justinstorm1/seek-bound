import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { QrCode } from '../components/icons';
import { Banner, PageTitle, Screen, TextField, useTheme } from '../components/ui';

export default function Join() {
  const { theme } = useTheme();
  const joinByCode = useMutation(api.games.joinByCode);
  const params = useLocalSearchParams<{ code?: string }>();

  const [code, setCode] = useState(() => (params.code ?? '').toUpperCase().slice(0, 6));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Game codes are 6 characters.');
      return;
    }
    try {
      setBusy(true);
      const { gameId } = await joinByCode({ code: trimmed });
      router.replace({ pathname: '/game/[gameId]/lobby', params: { gameId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join that game.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Join Game" keyboardAware>
      <PageTitle
        theme={theme}
        title="Enter game code"
        subtitle="Ask the host for the 6-character code, or scan their QR."
      />

      <TextField
        theme={theme}
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        placeholder="ABC123"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        maxLength={6}
        returnKeyType="go"
        onSubmitEditing={submit}
        style={{ fontSize: 26, letterSpacing: 8, textAlign: 'center', fontWeight: '800', paddingVertical: 18 }}
      />

      {error ? (
        <Banner theme={theme} tone="danger">
          {error}
        </Banner>
      ) : null}

      <Button label="Join game" onPress={submit} loading={busy} />

      <Pressable
        className="flex-row items-center justify-center gap-2 py-3"
        onPress={() => router.push('/scan-join')}
      >
        <QrCode size={16} color={theme.primary} />
        <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '700' }}>
          Scan a QR code instead
        </Text>
      </Pressable>
    </Screen>
  );
}
