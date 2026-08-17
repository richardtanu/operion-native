import '../global.css';

import { useEffect } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { OutboxProvider } from '../outbox/OutboxProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell() {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OutboxProvider>
          <AppShell />
        </OutboxProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
