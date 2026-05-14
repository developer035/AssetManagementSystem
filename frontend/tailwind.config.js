/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf6e9',
          100: '#f5ead1',
          200: '#ecd7a5',
          300: '#e0bf72',
          400: '#d4a45f',
          500: '#c58a3a',
          600: '#a86e24',
          700: '#82541c',
          800: '#5d3c18',
          900: '#3b2814',
          950: '#1d140b',
        },
        surface: {
          50: '#f6f4ef',
          100: '#ebe6dc',
          200: '#d8d0c2',
          300: '#b7ab9a',
          700: '#38444a',
          800: '#1c2429',
          900: '#0f161a',
          950: '#070b0d',
        },
      },
      fontFamily: {
        sans: ['"Avenir Next"', 'Avenir', '"Segoe UI"', 'sans-serif'],
        display: ['"Avenir Next"', 'Avenir', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SFMono-Regular"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 24px rgba(197, 138, 58, 0.26)',
        'glow-lg': '0 0 44px rgba(197, 138, 58, 0.34)',
        'inner-glow': 'inset 0 0 20px rgba(224, 191, 114, 0.12)',
      },
    },
  },
  plugins: [],
};
