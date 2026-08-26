const { color, space, radius } = require('./theme/tokens.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Flat palette, not nested — matches theme/tokens.js's `color` export
      // directly (ground/surface/panel/derived/ink/steel/mute/line/hair/tag/
      // good/warn/danger/info). The semantic `type` scale (screenTitle,
      // fieldLabel, etc.) isn't linear, so components pull it from
      // theme/tokens.js via inline style instead of a Tailwind fontSize scale.
      colors: { ...color },
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
