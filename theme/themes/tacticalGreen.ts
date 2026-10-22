import * as tokens from '../tokens';
import type { Theme } from '../themeTypes';

/**
 * The app's default theme since 21 Oct 2026 (first BLITZ_BDG's own) —
 * phosphor-green night-vision HUD, styling cue lifted
 * from an internal tactical-sim reference (Breach.html): dark ground,
 * glowing single-hue accent, multi-color status signals against it (cyan
 * "queued"/info, amber warn, red danger — same roles as the light theme,
 * different hues). Reuses the light theme's font/type/space/radius/
 * border/touch as-is: this is a palette + glow swap, not a new visual
 * system, and Barlow Condensed/Barlow/IBM Plex Mono already read
 * "stencilled tactical" without pulling in Rajdhani/Share Tech Mono and
 * their expo-font loading cost.
 */
const color = {
  ground: '#050B07',
  surface: '#081410',
  panel: '#0C1F17',
  derived: '#0F241A',

  ink: '#8CFFB0',
  steel: '#5FA37B',
  mute: '#3F6E55',

  line: '#2C5B3F',
  hair: '#1B3A28',

  tag: '#FFB238',
  good: '#59FFA0',
  warn: '#FFB24D',
  danger: '#FF5C78',
  info: '#4FD6FF',
};

const tone = {
  neutral: color.steel,
  success: color.good,
  warning: color.warn,
  danger: color.danger,
  pending: color.info,
};

const role = {
  gatedAction: color.tag,
  derivedField: color.derived,
  calloutBorder: color.line,
  queued: color.info,
  confirmed: color.good,
  failed: color.danger,
};

export const tacticalGreenTheme: Theme = {
  id: 'tacticalGreen',
  color,
  tone,
  font: tokens.font,
  type: tokens.type,
  space: tokens.space,
  radius: tokens.radius,
  border: tokens.border,
  touch: tokens.touch,
  role,
  glow: { color: color.ink, radius: 10 },
};
