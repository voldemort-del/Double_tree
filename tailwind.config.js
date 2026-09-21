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
          50:  '#f0f7ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7', // vibrant cyan-azure
          600: '#0369a1', // high-contrast deep ocean blue
          700: '#075985', // deep navy-blue, readable anywhere on white
          800: '#0c4a6e',
          900: '#082f49',
        },
        // ── Warm Sandstone / Cashmere ─────────────────────────────────────
        // Natural seaside limestone warmth without washed-out yellow tint.
        // Mid and dark tones have high contrast for text.
        sand: {
          50:  '#faf8f5',
          100: '#f3efe8',
          200: '#e6dfd3',
          300: '#d3c5b4',
          400: '#b49f87',
          500: '#876e55',
          600: '#68523c', // strong, accessible contrast on light backgrounds
          700: '#4e3c2b',
          800: '#382a1d',
          900: '#231910',
        },
        // ── Staff & Operations Slate ──────────────────────────────────────
        // Ultra-sharp slate with deep navy undertones.
        // ops-400 and ops-500 are strengthened so labels are crisp and readable!
        ops: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#64748b', // Slate 500 — strong readable contrast on light backgrounds
          500: '#475569', // Slate 600 — clear, crisp body text
          600: '#334155', // Slate 700 — deep high-contrast text
          700: '#1e293b', // Slate 800
          800: '#0f172a', // Slate 900
          900: '#090d16', // Ultra deep midnight navy
        },
        // ── Amber Gold Accent ─────────────────────────────────────────────
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
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
        'navy-sm':   '0 1px 3px 0 rgba(15,23,42,0.10), 0 1px 2px -1px rgba(15,23,42,0.06)',
        'navy-md':   '0 4px 12px 0 rgba(15,23,42,0.14), 0 2px 6px -2px rgba(15,23,42,0.06)',
        'gold-glow': '0 0 16px 0 rgba(2,132,199,0.30)',
      },
    },
  },
  plugins: [],
};
