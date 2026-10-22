import { Redirect } from 'expo-router';

// Always points at the auth group; the (auth) and (app) layouts' own
// useAuthGuard() bounce the user to the right place from there. Keeps the
// auth-status branching in one place (auth/useAuthGuard.ts) instead of
// repeated here too.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
