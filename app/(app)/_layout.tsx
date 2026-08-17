import { Stack } from 'expo-router';
import { useAuth } from '../../auth/AuthContext';
import { useAuthGuard } from '../../auth/useAuthGuard';

export default function AppLayout() {
  useAuthGuard();
  const { status } = useAuth();

  if (status !== 'authenticated') return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
