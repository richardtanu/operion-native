import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from './AuthContext';

/**
 * Centralizes the auth redirect in two places (this hook, used from both
 * route-group layouts) instead of scattering `if (!user) return <Login/>`
 * checks per screen.
 */
export function useAuthGuard() {
  const { status, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // BE-36: someone else chose this password (a reset, or a new account), so
  // Change password comes before anything else.
  const mustChange = !!user?.mustChangePassword;

  useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';
    const onChangePassword = segments.join('/') === '(app)/account/password';

    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && mustChange && !onChangePassword) {
      router.replace('/(app)/account/password');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(app)/dashboard');
    }
  }, [status, mustChange, segments, router]);
}
