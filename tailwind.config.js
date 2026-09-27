/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ── Mediterranean Sea / Sapphire Azure ───────────────────────────
        // Crisp, vivid ocean blue matching DoubleTree Malta's seaside location.
        // Provides high WCAG AAA contrast across both light and dark backgrounds.
        sea: {
          50:  '#f5f1e8',
          100: '#e9e0cf',
          200: '#d9c8a8',
          300: '#c9a86a',
          400: '#e1c892',
          500: '#b89354',
          600: '#98743c',
          700: '#75572d',
          800: '#4d391f',
          900: '#2a2117',
        },
        // ── Warm Sandstone / Cashmere ─────────────────────────────────────
        // Natural seaside limestone warmth without washed-out yellow tint.
        // Mid and dark tones have high contrast for text.
        sand: {
          50:  '#11110f',
          100: '#1a1916',
          200: '#24221e',
          300: '#2b2924',
          400: '#3a362f',
          500: '#8c867c',
          600: '#b8b1a4',
          700: '#d3cbbd',
          800: '#f3efe6',
          900: '#f5f1e8',
        },
        // ── Staff & Operations Slate ──────────────────────────────────────
        // Ultra-sharp slate with deep navy undertones.
        // ops-400 and ops-500 are strengthened so labels are crisp and readable!
        ops: {
          50:  '#11110f',
          100: '#1a1916',
          200: '#24221e',
          300: '#2b2924',
          400: '#8c867c',
          500: '#b8b1a4',
          600: '#d3cbbd',
          700: '#e5dfd3',
          800: '#f3efe6',
          900: '#11110f',
        },
        // ── Amber Gold Accent ─────────────────────────────────────────────
        gold: {
          50:  '#fbf6ea',
          100: '#f3e6c7',
          200: '#e1c892',
          300: '#d7b877',
          400: '#c9a86a',
          500: '#b89354',
          600: '#98743c',
          700: '#75572d',
          800: '#4d391f',
          900: '#2a2117',
        },
      },
      animation: {
        'fade-in':        'fadeIn 0.4s ease-out',
        'slide-up':       'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft':     'pulseSoft 2s ease-in-out infinite',
        'shimmer':        'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:      { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft:    { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        shimmer:      { '0%': { backgroundPosition: '-200% center' }, '100%': { backgroundPosition: '200% center' } },
      },
      boxShadow: {
        'navy-sm':   '0 1px 3px 0 rgba(0,0,0,0.28), 0 1px 2px -1px rgba(0,0,0,0.18)',
        'navy-md':   '0 4px 12px 0 rgba(0,0,0,0.36), 0 2px 6px -2px rgba(0,0,0,0.22)',
        'gold-glow': '0 0 16px 0 rgba(201,168,106,0.18)',
      },
    },
  },
  plugins: [],
};
