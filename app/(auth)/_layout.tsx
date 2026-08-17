import { Stack } from 'expo-router';
import { useAuth } from '../../auth/AuthContext';
import { useAuthGuard } from '../../auth/useAuthGuard';

export default function AuthLayout() {
  useAuthGuard();
  const { status } = useAuth();

  if (status === 'loading') return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
