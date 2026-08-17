import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, TextField } from '../../components';
import { useAuth } from '../../auth/AuthContext';

// Blocking-error, manual-retry flow (plan.md §3) — login calls the API
// directly through AuthContext, never through the outbox. A queued login
// would be meaningless: there's no session to act on until it resolves.
export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-0">
      <View className="flex-1 justify-center gap-lg px-xl">
        <View className="gap-xs">
          <Text className="text-2xl font-bold text-neutral-900">Operion</Text>
          <Text className="text-base text-neutral-500">Sign in to continue</Text>
        </View>

        <View className="gap-md">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
        </View>

        {error ? <Text className="text-sm text-status-danger">{error}</Text> : null}

        <Button label={submitting ? 'Signing in…' : 'Sign in'} onPress={handleSubmit} disabled={submitting} />
      </View>
    </SafeAreaView>
  );
}
