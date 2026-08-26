/**
 * Operion design tokens.
 *
 * Plain JS on purpose — tailwind.config loads this via Node `require`,
 * which can't parse TS. Types live in tokens.d.ts.
 *
 * Direction: a range safety board. Concrete ground, stencilled labels,
 * hazard yellow as the single loud element. Built for a shared tablet
 * held one-handed in mixed light, not a desk.
 *
 * Replaces the unbranded placeholder set. Every value below is used by
 * the Module 1 screens; nothing here is speculative.
 */

const color = {
  // Grounds — warm grey, never white-on-white. Concrete, not cream.
  ground: '#DFDDD6',   // app background behind cards
  surface: '#F7F6F2',  // screen body
  panel: '#FFFFFF',    // cards, editable inputs
  derived: '#EDEBE4',  // server-computed fields — visibly not editable

  // Ink
  ink: '#15171A',      // primary text, headers, primary buttons
  steel: '#5C6670',    // secondary text
  mute: '#8A9099',     // labels, placeholders, disabled

  // Rules
  line: '#C6C3BA',     // input borders, dividers that matter
  hair: '#E4E2DB',     // internal card dividers

  // Signal. Only one is loud.
  tag: '#E8B10A',      // hazard yellow — scope gates, accents on ink
  good: '#2E7D4F',     // confirmed, approved, active
  warn: '#C97C10',     // pending, needs attention
  danger: '#AF2A20',   // blocked, failed, rejected
  info: '#2C5A82',     // queued, neutral in-progress
};

/**
 * Chip tones — maps the five-tone Chip contract onto the palette.
 * Screens with two independent status dimensions (Realisasi's status +
 * varianceStatus) render two Chips; the component itself renders one.
 */
const tone = {
  neutral: color.steel,
  success: color.good,
  warning: color.warn,
  danger: color.danger,
  pending: color.info,
};

/**
 * Type. Three families, each with one job.
 *  display — Barlow Condensed. Headings and stencilled labels. Condensed
 *            survives long Indonesian labels in a 390pt column.
 *  body    — Barlow. Prose, helper text, callouts.
 *  mono    — IBM Plex Mono. Anything a person reads back aloud:
 *            IDs, quantities, money, timestamps. Digits align in columns.
 *
 * Load via expo-font. Falling back to system fonts loses the whole
 * visual language, so check loaded state before first paint.
 */
const font = {
  display: 'BarlowCondensed_600SemiBold',
  displayBold: 'BarlowCondensed_700Bold',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_600SemiBold',
};

const type = {
  screenTitle: { family: font.displayBold, size: 20, letterSpacing: 0.8 },
  heading: { family: font.displayBold, size: 30, lineHeight: 32 },
  cardTitle: { family: font.displayBold, size: 21, lineHeight: 23 },
  sectionLabel: { family: font.display, size: 11, letterSpacing: 1.8, uppercase: true },
  fieldLabel: { family: font.display, size: 10, letterSpacing: 1.4, uppercase: true },
  body: { family: font.body, size: 14, lineHeight: 20 },
  helper: { family: font.body, size: 12, lineHeight: 17 },
  value: { family: font.mono, size: 14 },
  valueLarge: { family: font.monoMedium, size: 26 },
  button: { family: font.displayBold, size: 17, letterSpacing: 0.85, uppercase: true },
  chip: { family: font.displayBold, size: 12, letterSpacing: 1.1, uppercase: true },
};

const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Near-square. Rounded corners read consumer; this is equipment. */
const radius = { sm: 2, md: 4, pill: 999 };

const border = { hair: 1, base: 1.5, strong: 2 };

/**
 * Minimum 44. Range staff wear gloves and the device is often held
 * one-handed while the other hand holds a can.
 */
const touch = { min: 44, control: 32 };

/**
 * Semantic roles. Prefer these over raw colors in components — it keeps
 * the meaning of a color in one place rather than spread across screens.
 */
const role = {
  /** Action is scope-gated. Plain border means anyone can press it —
   *  the asymmetry is the point, don't normalise it away. */
  gatedAction: color.tag,
  /** Server-derived, never editable. Must never render as a plain input. */
  derivedField: color.derived,
  /** Open question kept visible instead of silently resolved. */
  calloutBorder: color.line,
  /** Outbox write states. */
  queued: color.info,
  confirmed: color.good,
  failed: color.danger,
};

module.exports = { color, tone, font, type, space, radius, border, touch, role };
