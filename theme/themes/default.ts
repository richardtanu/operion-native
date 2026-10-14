import * as tokens from '../tokens';
import type { Theme } from '../themeTypes';

/**
 * "Range safety board" — the default theme every tenant gets unless a
 * `THEMES_BY_TENANT` entry in ThemeContext.tsx overrides it. Just the
 * existing theme/tokens.js wrapped in the shape ThemeContext expects; the
 * plain-JS file itself stays as-is since tailwind.config.js still `require`s
 * it directly for the spacing/radius scale (Node can't parse TS there).
 */
export const defaultTheme: Theme = {
  id: 'default',
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
