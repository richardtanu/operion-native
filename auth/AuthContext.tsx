import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { login as loginRequest } from '../api/auth';
import { ApiError } from '../api/httpError';
import type { AuthUser } from '../api/types';
import { tokenStorage } from './tokenStorage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await tokenStorage.getToken();
      if (stored) {
        // A stored token with no user record is a known scaffold gap: there's
        // no "get current user" endpoint wired up yet (no OpenAPI spec to
        // confirm one against). Treat presence of a token as authenticated
        // for routing purposes; real user hydration is a follow-up once a
        // /me-equivalent endpoint is known.
        setToken(stored);
        setStatus('authenticated');
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
          const response = await loginRequest({ email, password });
          await tokenStorage.setToken(response.accessToken);
          setToken(response.accessToken);
          setUser(response.user);
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
