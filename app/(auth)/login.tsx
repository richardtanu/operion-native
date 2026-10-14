import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, TextField } from '../../components';
import { useAuth } from '../../auth/AuthContext';
import { ThemeContext, useTheme } from '../../theme/ThemeContext';
import { tacticalGreenTheme } from '../../theme/themes/tacticalGreen';
import { textStyle } from '../../theme/typeStyle';


// Blocking-error, manual-retry flow — login calls the API directly through
// AuthContext, never through the outbox. A queued login would be
// meaningless: there's no session to act on until it resolves.
//
// Always renders in the tactical-green theme, regardless of which tenant
// the credentials being typed belong to — there's no tenant to resolve
// against yet at this point (that only exists after GET /auth/me succeeds),
// so this is a fixed brand choice for the entry screen, not a preview of
// the tenant-resolved theme the app switches to post-login.
export default function LoginScreen() {
  return (
    <ThemeContext.Provider value={tacticalGreenTheme}>
      <LoginScreenBody />
    </ThemeContext.Provider>
  );
}

function LoginScreenBody() {
  const { color, type: typeScale } = useTheme();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <View className="flex-1 justify-center gap-lg px-xl">
        <View className="gap-xs">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Operion</Text>
          <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Sign in to continue</Text>
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

        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}

        <Button label={submitting ? 'Signing in…' : 'Sign in'} onPress={handleSubmit} disabled={submitting} />
      </View>
    </SafeAreaView>
  );
}
