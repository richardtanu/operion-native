import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { getMe, login as loginRequest } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
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
  /** True when the user was signed out because the server rejected their token, not by choice. */
  sessionExpired: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Tokens last 24h. Any request rejected with 401 mid-session lands here,
  // so an expired session sends the user back to login instead of every
  // screen showing its own error.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void tokenStorage.clearToken();
      setToken(null);
      setUser(null);
      setSessionExpired(true);
      setStatus('unauthenticated');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await tokenStorage.getToken();
      if (stored) {
        setToken(stored);
        try {
          setUser(await getMe(stored));
          setStatus('authenticated');
        } catch (err) {
          // Only a 401 means the stored token is dead (expired/revoked) — drop
          // it. A network failure says nothing about the token, so keep it and
          // let the next launch try again; either way, route through login
          // rather than staying stuck in a half-authenticated state.
          if (err instanceof ApiError && err.status === 401) {
            await tokenStorage.clearToken();
            setSessionExpired(true);
          }
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
          const { token: newToken } = await loginRequest({ email, password }).catch((err: unknown) => {
            // The backend answers an unknown email with 400 and a wrong
            // password with 401 — show both the same way so the screen
            // doesn't reveal which emails have accounts. A field-validation
            // 400 (blank email) keeps its own message.
            if (err instanceof ApiError && (err.status === 401 || (err.status === 400 && !err.message.startsWith('Validation failed')))) {
              throw new ApiError(err.status, 'Email or password is incorrect.', err.body);
            }
            throw err;
          });
          const profile = await getMe(newToken);
          await tokenStorage.setToken(newToken);
          setToken(newToken);
          setUser(profile);
          setSessionExpired(false);
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
        setSessionExpired(false);
        setStatus('unauthenticated');
      },
      sessionExpired,
    }),
    [status, user, token, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
