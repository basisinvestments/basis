import type { Config } from 'tailwindcss';

/**
 * Only the tokens that carry meaning live here. Everything else stays an arbitrary
 * bracket value so class strings port verbatim between the design-system reference
 * and the components — see docs/design-system.md §3.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // interface
        accent: '#AFDDFF',
        'accent-hi': '#c8e8ff',
        // data semantics — these mean something, never decorative
        ref: 'var(--ref)',   // the real world: exchange price x multiplier
        pool: '#AFDDFF',     // on-chain
        hot: '#FF6B4A',      // the gap
        // flag scale
        mint: '#5BD6A0',
        warn: '#FFC773',
        grey: '#6E7488',
        viol: '#B79CFF',
      },
      // The interactive curve, as the default for every `transition-*` utility. The
      // design system documented cubic-bezier(0.76, 0, 0.24, 1) and printed it on
      // /system, and it was applied nowhere.
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
      fontFamily: {
        graphik: ['var(--font-display)', 'Archivo', 'Graphik LCG', 'sans-serif'],
        manrope: ['var(--font-ui)', 'Manrope', 'sans-serif'],
        data: ['var(--font-data)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
