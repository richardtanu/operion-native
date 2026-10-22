/**
 * Shape every theme must conform to — mirrors theme/tokens.d.ts (the
 * default theme's types) so `useTheme()` returns something identical to
 * the old `import * as tokens from '../theme/tokens'` shape, just resolved
 * per-tenant at runtime instead of statically at build time.
 */
export interface ThemeColors {
  ground: string;
  surface: string;
  panel: string;
  derived: string;
  ink: string;
  steel: string;
  mute: string;
  line: string;
  hair: string;
  tag: string;
  good: string;
  warn: string;
  danger: string;
  info: string;
}

export type ThemeToneName = 'neutral' | 'success' | 'warning' | 'danger' | 'pending';
export type ThemeTones = Record<ThemeToneName, string>;

export interface ThemeFonts {
  display: string;
  displayBold: string;
  body: string;
  bodyMedium: string;
  mono: string;
  monoMedium: string;
}

export interface ThemeTypeStyle {
  family: string;
  size: number;
  lineHeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
}

export interface ThemeTypeScale {
  screenTitle: ThemeTypeStyle;
  heading: ThemeTypeStyle;
  cardTitle: ThemeTypeStyle;
  sectionLabel: ThemeTypeStyle;
  fieldLabel: ThemeTypeStyle;
  body: ThemeTypeStyle;
  helper: ThemeTypeStyle;
  value: ThemeTypeStyle;
  valueLarge: ThemeTypeStyle;
  button: ThemeTypeStyle;
  chip: ThemeTypeStyle;
}

export interface ThemeSpace {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeRadius {
  sm: number;
  md: number;
  pill: number;
}

export interface ThemeBorder {
  hair: number;
  base: number;
  strong: number;
}

export interface ThemeTouch {
  min: number;
  control: number;
}

export interface ThemeRoles {
  gatedAction: string;
  derivedField: string;
  calloutBorder: string;
  queued: string;
  confirmed: string;
  failed: string;
}

/**
 * Optional glow spec for HUD-style themes (tactical/night-vision) —
 * `undefined` on a theme means "no glow", components must treat that as a
 * no-op rather than assuming every theme wants one. Kept to RN's real
 * shadow props (iOS-reliable; Android's `elevation` can't tint, so glow is
 * a nice-to-have there, not load-bearing for legibility).
 */
export interface ThemeGlow {
  color: string;
  radius: number;
}

export interface Theme {
  id: string;
  color: ThemeColors;
  tone: ThemeTones;
  font: ThemeFonts;
  type: ThemeTypeScale;
  space: ThemeSpace;
  radius: ThemeRadius;
  border: ThemeBorder;
  touch: ThemeTouch;
  role: ThemeRoles;
  /** Present only on themes that want a neon/HUD glow on key accents (buttons, focus, status dots). */
  glow?: ThemeGlow;
}
