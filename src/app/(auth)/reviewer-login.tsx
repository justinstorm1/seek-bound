import { useAuthActions } from '@convex-dev/auth/react';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Button } from '../../components/Button';
import { Eye, EyeOff } from '../../components/icons';
import { Card, Field, Screen, TextField, useTheme } from '../../components/ui';

/**
 * Email + password sign-in for App Store / Play Store reviewers, who can't
 * get through the NJIT-only Google sign-in. Only reachable from the "Login
 * for App Reviewer" button on the main sign-in screen, itself hidden behind
 * the `SHOWING_EMAIL_LOGIN` remote flag. The account still has to be an
 * allowlisted email server-side (`AUTH_ALLOWED_EXTRA_EMAILS`) regardless.
 *
 * Sign-in only — the account itself is provisioned separately, not from here.
 */
export default function ReviewerLogin() {
  const { theme } = useTheme();
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState('seekboundStormXR@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Enter both an email and a password.');
      return;
    }
    setBusy(true);
    try {
      await signIn('password', { email: email.trim(), password, flow: 'signIn' });
    } catch (error) {
      Alert.alert(
        'Sign-in failed',
        error instanceof Error ? error.message : 'Check the email and password and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="App Reviewer Login">
      <Card theme={theme}>
        <Field theme={theme} label="Email">
          <TextField
            theme={theme}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy}
          />
        </Field>
        <Field theme={theme} label="Password">
          <View className="justify-center">
            <TextField
              theme={theme}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              style={{ paddingRight: 46 }}
            />
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              hitSlop={10}
              style={{ position: 'absolute', right: 14 }}
            >
              {showPassword ? (
                <EyeOff size={19} color={theme.textTertiary} />
              ) : (
                <Eye size={19} color={theme.textTertiary} />
              )}
            </Pressable>
          </View>
        </Field>
      </Card>

      <Button
        label={busy ? 'Please wait…' : 'Sign in'}
        onPress={submit}
        loading={busy}
        disabled={busy}
      />
    </Screen>
  );
}
