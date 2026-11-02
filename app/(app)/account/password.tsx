import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Field } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { changePassword } from '../../../api/auth';
import { ApiError } from '../../../api/httpError';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


// Change password (BE-32, BE-36). Anyone signed in, their own only, proving
// the current one first; a wrong one is a 400 and keeps you signed in. The
// change ends every older sign-in, this phone's too, so the fresh token that
// comes back replaces the stored one. When someone else chose the password
// (a reset, or a new account) the auth guard opens this screen before any
// other and there's no way back, only sign out.
export default function ChangePasswordScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const { user, token, adoptToken, logout } = useAuth();
  const forced = !!user?.mustChangePassword;

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!current) return setError('Enter your current password.');
    if (next.length < 8 || next.length > 72) return setError('The new password must be 8 to 72 characters.');
    if (next === current) return setError('Choose a password different from your current one.');
    if (next !== repeat) return setError('The two new passwords don’t match.');
    if (!token) return setError('Not signed in.');

    setSubmitting(true);
    try {
      await adoptToken(await changePassword({ currentPassword: current, newPassword: next }, token));
      setCurrent('');
      setNext('');
      setRepeat('');
      if (forced) router.replace('/(app)/dashboard');
      else setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <View className="flex-1 gap-lg px-xl pt-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Password changed</Text>
          <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>
            This phone stays signed in. Anywhere else you were signed in has been signed out.
          </Text>
          <Button label="Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Change password</Text>

        {forced ? (
          <Callout tone="warning" title="Choose your own password">
            Someone else set your current password. Choose your own before you go on.
          </Callout>
        ) : null}

        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" />
        <Field
          label="New password"
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoCapitalize="none"
          sub="8 to 72 characters."
        />
        <Field label="New password again" value={repeat} onChangeText={setRepeat} secureTextEntry autoCapitalize="none" />

        {error ? <Callout tone="danger">{error}</Callout> : null}

        <Button label={submitting ? 'Saving…' : 'Change password'} disabled={submitting} onPress={handleSubmit} />
        {forced ? (
          <Button label="Sign out" variant="secondary" onPress={logout} />
        ) : (
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
