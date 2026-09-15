import { useAction, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { api } from '../../convex/_generated/api';
import { Button } from '../components/Button';
import { Card, Field, Screen, TextField, useTheme } from '../components/ui';

export default function AdminBroadcast() {
  const { theme } = useTheme();
  const isAdmin = useQuery(api.push.amIAdmin);
  const broadcast = useAction(api.push.broadcastToAll);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing text', 'Add a title and a message before sending.');
      return;
    }
    setSending(true);
    try {
      const result = await broadcast({ title: title.trim(), body: body.trim() });
      const summary = `Delivered to ${result.sent} device${result.sent === 1 ? '' : 's'}${result.failed ? ` (${result.failed} failed)` : ''}.`;
      Alert.alert(
        result.sent > 0 ? 'Sent' : 'Nothing delivered',
        result.errors.length > 0 ? `${summary}\n\n${result.errors.join('\n')}` : summary,
      );
      if (result.sent > 0) {
        setTitle('');
        setBody('');
        router.back();
      }
    } catch (error) {
      Alert.alert('Failed to send', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSending(false);
    }
  };

  if (isAdmin === false) {
    return (
      <Screen title="Announcement">
        <Text style={{ color: theme.text }}>You&rsquo;re not authorized to send announcements.</Text>
      </Screen>
    );
  }

  return (
    <Screen title="Announcement">
      <Card theme={theme}>
        <Field theme={theme} label="Title">
          <TextField
            theme={theme}
            value={title}
            onChangeText={setTitle}
            placeholder="New feature!"
            maxLength={120}
            editable={!sending}
          />
        </Field>
        <Field theme={theme} label="Message" hint="Sent to every player who has notifications enabled.">
          <TextField
            theme={theme}
            value={body}
            onChangeText={setBody}
            placeholder="Tell everyone what's new…"
            maxLength={500}
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
            editable={!sending}
          />
        </Field>
      </Card>
      <Button
        label={sending ? 'Sending…' : 'Send to everyone'}
        onPress={send}
        loading={sending}
        disabled={sending}
      />
    </Screen>
  );
}
