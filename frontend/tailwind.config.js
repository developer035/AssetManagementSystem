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
          50: '#ecfbf5',
          100: '#d7f5e7',
          200: '#b0e9ce',
          300: '#80d9ad',
          400: '#48c586',
          500: '#149760',
          600: '#0f7a4f',
          700: '#0c6140',
          800: '#0b4a33',
          900: '#0b3b29',
          950: '#07241a',
        },
        surface: {
          50: '#f4f7f5',
          100: '#e7efeb',
          200: '#cfdcd6',
          300: '#97aca3',
          700: '#40504b',
          800: '#22332d',
          900: '#13221e',
          950: '#0a1311',
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
        'glow': '0 0 24px rgba(20, 151, 96, 0.22)',
        'glow-lg': '0 0 44px rgba(20, 151, 96, 0.28)',
        'inner-glow': 'inset 0 0 20px rgba(72, 197, 134, 0.12)',
      },
    },
  },
  plugins: [],
};
