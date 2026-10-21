import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useAuth } from '../auth/AuthContext';
import { defaultTheme } from './themes/default';
import { tacticalGreenTheme } from './themes/tacticalGreen';
import type { Theme } from './themeTypes';

/** Add a tenant here to give it its own look; anything not listed gets `defaultTheme`. */
const THEMES_BY_TENANT: Record<string, Theme> = {
  BLITZ_BDG: tacticalGreenTheme,
  // HQ above BLITZ_BDG (BE-21, decided 21 Oct 2026); Tactical Green is HQ's main theme too.
  HQ_BANDUNG: tacticalGreenTheme,
};

/**
 * Exported (not just the hook) so a screen that must show a specific theme
 * regardless of the logged-in tenant — e.g. login, before any tenant is
 * known — can nest its own `<ThemeContext.Provider value={...}>` inside the
 * app-wide one and override it for just that subtree.
 */
export const ThemeContext = createContext<Theme>(defaultTheme);

/**
 * Must sit inside AuthProvider — resolves theme from `user.tenantCode`
 * (GET /auth/me), so it only knows the real tenant once auth has loaded.
 * Before that (or if tenantCode is missing/unrecognized), it falls back to
 * `defaultTheme` rather than blocking render on it.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const theme = useMemo(() => {
    const code = user?.tenantCode;
    return (code && THEMES_BY_TENANT[code]) || defaultTheme;
  }, [user?.tenantCode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Replaces `import * as tokens from '../theme/tokens'` — same shape, resolved per-tenant instead of statically. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
