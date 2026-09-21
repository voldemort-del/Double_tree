/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Mediterranean warm palette for guest UI
        sand: {
          50: '#fbf8f3',
          100: '#f5efe4',
          200: '#ebe0cc',
          300: '#dcc9a8',
          400: '#c8ab7d',
          500: '#b6945e',
          600: '#a37e4e',
          700: '#856540',
          800: '#6b5237',
          900: '#584430',
        },
        sea: {
          50: '#f0f7f8',
          100: '#daeef0',
          200: '#b8dde1',
          300: '#88c5cd',
          400: '#54a4b0',
          500: '#3a8a98',
          600: '#34717d',
          700: '#2f5b65',
          800: '#2c4b54',
          900: '#293f47',
        },
        // Staff operational palette
        ops: {
          50: '#f5f7fa',
          100: '#eaeef4',
          200: '#d5dde8',
          300: '#b0c0d4',
          400: '#869db8',
          500: '#6680a0',
          600: '#516886',
          700: '#42556e',
          800: '#38475b',
          900: '#1e293b',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
