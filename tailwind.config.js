const { colors, spacing, radii, typography } = require('./theme/tokens.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        neutral: colors.neutral,
        brand: colors.brand,
        status: colors.status,
      },
      spacing: {
        xs: `${spacing.xs}px`,
        sm: `${spacing.sm}px`,
        md: `${spacing.md}px`,
        lg: `${spacing.lg}px`,
        xl: `${spacing.xl}px`,
        '2xl': `${spacing['2xl']}px`,
        '3xl': `${spacing['3xl']}px`,
      },
      borderRadius: {
        sm: `${radii.sm}px`,
        md: `${radii.md}px`,
        lg: `${radii.lg}px`,
        full: `${radii.full}px`,
      },
      fontSize: {
        xs: `${typography.size.xs}px`,
        sm: `${typography.size.sm}px`,
        base: `${typography.size.base}px`,
        lg: `${typography.size.lg}px`,
        xl: `${typography.size.xl}px`,
        '2xl': `${typography.size['2xl']}px`,
      },
    },
  },
  plugins: [],
};
