import '../global.css';

import { useEffect } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Barlow_400Regular, Barlow_500Medium } from '@expo-google-fonts/barlow';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { IBMPlexMono_400Regular, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { OutboxProvider } from '../outbox/OutboxProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'loading' && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status, fontsLoaded]);

  // theme/tokens.js's whole visual language (Barlow Condensed / Barlow / IBM
  // Plex Mono) depends on these being loaded before first paint — falling
  // back to system fonts silently loses it rather than erroring, so this
  // gates render instead of racing it.
  if (!fontsLoaded) return null;

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_600SemiBold,
  });

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OutboxProvider>
          <AppShell fontsLoaded={fontsLoaded} />
        </OutboxProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
