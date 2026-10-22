import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './AuthContext';

/**
 * Centralizes the auth redirect in two places (this hook, used from both
 * route-group layouts) instead of scattering `if (!user) return <Login/>`
 * checks per screen.
 */
export function useAuthGuard() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(app)/dashboard');
    }
  }, [status, segments, router]);
}
