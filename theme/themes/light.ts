import * as tokens from '../tokens';
import type { Theme } from '../themeTypes';

/**
 * "Range safety board" — the light theme. Since 21 Oct 2026 the app's default
 * is Tactical Green (ThemeContext.tsx); a tenant gets this one only through a
 * `THEMES_BY_TENANT` entry. It is still the theme the design file
 * (operion.pen) is drawn in, by the product owner's choice. Just the existing
 * theme/tokens.js wrapped in the shape ThemeContext expects; the plain-JS file
 * itself stays as-is since tailwind.config.js still `require`s it directly for
 * the spacing/radius scale (Node can't parse TS there).
 */
export const lightTheme: Theme = {
  id: 'light',
  color: tokens.color,
  tone: tokens.tone,
  font: tokens.font,
  type: tokens.type,
  space: tokens.space,
  radius: tokens.radius,
  border: tokens.border,
  touch: tokens.touch,
  role: tokens.role,
};
