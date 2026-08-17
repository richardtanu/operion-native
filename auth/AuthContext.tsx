import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { getMe, login as loginRequest } from '../api/auth';
import { ApiError } from '../api/httpError';
import type { UserProfileResponse } from '../api/types';
import { tokenStorage } from './tokenStorage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: UserProfileResponse | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await tokenStorage.getToken();
      if (stored) {
        setToken(stored);
        try {
          setUser(await getMe(stored));
          setStatus('authenticated');
        } catch {
          // Stored token is no longer valid (expired/revoked) — drop it and
          // send the user back through login rather than staying stuck in a
          // half-authenticated state.
          await tokenStorage.clearToken();
          setToken(null);
          setStatus('unauthenticated');
        }
      } else {
        setStatus('unauthenticated');
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      login: async (email, password) => {
        // Login is a blocking-error, manual-retry flow (plan.md §3) — it
        // must never be outbox-queued, so this calls the API layer directly
        // rather than going through useOutboxAction.
        try {
          const { token: newToken } = await loginRequest({ email, password });
          const profile = await getMe(newToken);
          await tokenStorage.setToken(newToken);
          setToken(newToken);
          setUser(profile);
          setStatus('authenticated');
        } catch (err) {
          if (err instanceof ApiError) throw err;
          // Preserve the real message (e.g. env.ts's "EXPO_PUBLIC_API_BASE_URL is
          // not set" assertion) instead of masking it with a generic string —
          // that specific message is what tells you what to actually fix.
          const message = err instanceof Error ? err.message : 'Network error — check the API base URL and connection.';
          throw new ApiError(0, message);
        }
      },
      logout: async () => {
        await tokenStorage.clearToken();
        setToken(null);
        setUser(null);
        setStatus('unauthenticated');
      },
    }),
    [status, user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
