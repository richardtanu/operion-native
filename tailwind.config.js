const { space, radius } = require('./theme/tokens.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Color intentionally NOT registered here. Colors now resolve
      // per-tenant at runtime via theme/ThemeContext.tsx's useTheme(), and
      // every component reads them through inline `style`, never a
      // Tailwind class — a `colors` extension here would be frozen to
      // theme/tokens.js's default palette at build time and silently lie
      // for any tenant on a different theme. Spacing/radius stay universal
      // (layout doesn't vary per tenant, only the skin does), so those two
      // are still fine to load statically from the default token set.
      spacing: {
        xs: `${space.xs}px`,
        sm: `${space.sm}px`,
        md: `${space.md}px`,
        lg: `${space.lg}px`,
        xl: `${space.xl}px`,
        xxl: `${space.xxl}px`,
      },
      borderRadius: {
        sm: `${radius.sm}px`,
        md: `${radius.md}px`,
        pill: `${radius.pill}px`,
      },
    },
  },
  plugins: [],
};
