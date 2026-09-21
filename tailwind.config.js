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
        // ── Guest UI ─ Champagne & Warm Gold ──────────────────────────────
        sand: {
          50:  '#fdf9f2',
          100: '#f8f0e0',
          200: '#f0dfc0',
          300: '#e5c98e',
          400: '#d9ae60',
          500: '#c99840',
          600: '#b07d2c',
          700: '#8e6224',
          800: '#6e4c1e',
          900: '#4a311a',
        },
        sea: {
          50:  '#fdf8ec',
          100: '#f8eccb',
          200: '#f0d795',
          300: '#e5bc58',
          400: '#d9a232',
          500: '#c08020',
          600: '#9e641a',
          700: '#7c4d17',
          800: '#5e3b14',
          900: '#3d2610',
        },
        // ── Staff / Ops UI ─ Deep Navy ─────────────────────────────────────
        ops: {
          50:  '#f2f4f8',
          100: '#e2e8f0',
          200: '#c5d0e2',
          300: '#97aec8',
          400: '#6487a8',
          500: '#456890',
          600: '#355275',
          700: '#294061',
          800: '#1e3050',
          900: '#0f1e35',
        },
      },
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out',
        'slide-up':      'slideUp 0.4s ease-out',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'pulse-soft':    'pulseSoft 2s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
      },
      boxShadow: {
        'navy-sm':  '0 1px 3px 0 rgba(15,30,53,0.12), 0 1px 2px -1px rgba(15,30,53,0.08)',
        'navy-md':  '0 4px 12px 0 rgba(15,30,53,0.15), 0 2px 6px -2px rgba(15,30,53,0.08)',
        'gold-glow':'0 0 16px 0 rgba(192,128,32,0.25)',
      },
    },
  },
  plugins: [],
};
