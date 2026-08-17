// Single source of truth for design tokens. Plain JS (not .ts) on purpose:
// tailwind.config.js requires this file with plain Node `require`, which has
// no TypeScript transform available — a .ts file with type syntax would fail
// to parse there. App code gets typing back via the companion tokens.d.ts
// sitting next to this file. Colors are deliberately unbranded — no visual
// design has happened yet (this is a scaffold, not a design pass); swap these
// once real screens go through the plan doc's screen-inventory process.

const colors = {
  neutral: {
    0: '#FFFFFF',
    50: '#F7F7F8',
    100: '#EDEEF0',
    200: '#DBDDE1',
    300: '#B7BBC2',
    400: '#8B909B',
    500: '#666B76',
    600: '#4B4F58',
    700: '#33363D',
    800: '#212327',
    900: '#131417',
  },
  brand: {
    500: '#2C5CF6',
    600: '#1E46D6',
  },
  status: {
    success: '#1E8E5A',
    warning: '#B8720A',
    danger: '#C23A2E',
    pending: '#6B6F76',
  },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

const typography = {
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

module.exports = { colors, spacing, radii, typography };
