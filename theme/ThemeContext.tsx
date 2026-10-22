import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useAuth } from '../auth/AuthContext';
import { tacticalGreenTheme } from './themes/tacticalGreen';
import type { Theme } from './themeTypes';

/**
 * The app's default theme (product owner, 21 Oct 2026): every tenant gets
 * Tactical Green unless `THEMES_BY_TENANT` says otherwise. The light "range
 * safety board" theme (themes/light.ts) stays available per tenant, and is
 * still what the design file is drawn in.
 */
const APP_DEFAULT_THEME: Theme = tacticalGreenTheme;

/** Give a tenant a look other than the default, e.g. `SOME_CODE: lightTheme`. Empty today. */
const THEMES_BY_TENANT: Record<string, Theme> = {};

/**
 * Exported (not just the hook) so a screen that must show a specific theme
 * regardless of the logged-in tenant — e.g. login, before any tenant is
 * known — can nest its own `<ThemeContext.Provider value={...}>` inside the
 * app-wide one and override it for just that subtree.
 */
export const ThemeContext = createContext<Theme>(APP_DEFAULT_THEME);

/**
 * Must sit inside AuthProvider — resolves theme from `user.tenantCode`
 * (GET /auth/me), so it only knows the real tenant once auth has loaded.
 * Before that (or if tenantCode is missing/unlisted), it uses the default
 * rather than blocking render on it.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const theme = useMemo(() => {
    const code = user?.tenantCode;
    return (code && THEMES_BY_TENANT[code]) || APP_DEFAULT_THEME;
  }, [user?.tenantCode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Replaces `import * as tokens from '../theme/tokens'` — same shape, resolved per-tenant instead of statically. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
