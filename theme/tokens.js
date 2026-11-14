/**
 * Operion design tokens — the LIGHT theme ("range safety board"), wrapped by
 * theme/themes/light.ts. Since 21 Oct 2026 the app's default theme is
 * Tactical Green (theme/themes/tacticalGreen.ts, chosen in
 * theme/ThemeContext.tsx); a tenant gets this one only through a
 * THEMES_BY_TENANT entry. The design file (operion.pen) is still drawn in it.
 *
 * Plain JS on purpose — tailwind.config loads this via Node `require`,
 * which can't parse TS. Types live in tokens.d.ts. Only spacing/radius are
 * actually pulled into Tailwind though — colors are runtime/per-tenant via
 * useTheme(), never a Tailwind class, so a color changes here still only
 * changes it for tenants on this theme, not globally.
 *
 * Direction: a range safety board. Concrete ground, stencilled labels,
 * hazard yellow as the single loud element. Built for a shared tablet
 * held one-handed in mixed light, not a desk.
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
 * Type. Since 15 Nov 2026 the app reads like a phone app, not a web page:
 * sentence-case titles and labels in Barlow, money and counts in Barlow
 * with tabular digits so columns still line up.
 *  display — Barlow Condensed. Only small uppercase tags (callout titles).
 *  body    — Barlow, three weights. Titles, prose, labels, buttons, values.
 *  mono    — IBM Plex Mono. IDs and codes a person reads back aloud.
 *
 * Load via expo-font. Falling back to system fonts loses the whole
 * visual language, so check loaded state before first paint.
 */
const font = {
  display: 'BarlowCondensed_600SemiBold',
  displayBold: 'BarlowCondensed_700Bold',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_600SemiBold',
};

const type = {
  screenTitle: { family: font.bodyBold, size: 18 },
  heading: { family: font.bodyBold, size: 24, lineHeight: 30 },
  cardTitle: { family: font.bodyBold, size: 17, lineHeight: 22 },
  sectionLabel: { family: font.bodyMedium, size: 13, letterSpacing: 0.6, uppercase: true },
  fieldLabel: { family: font.bodyMedium, size: 13 },
  body: { family: font.body, size: 15, lineHeight: 21 },
  helper: { family: font.body, size: 13, lineHeight: 18 },
  value: { family: font.bodyMedium, size: 15, tabular: true },
  valueLarge: { family: font.bodyBold, size: 24, tabular: true },
  button: { family: font.bodyBold, size: 16 },
  chip: { family: font.bodyMedium, size: 12 },
};

const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Rounded like a phone app (15 Nov 2026): fields and buttons md, cards lg. */
const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

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
