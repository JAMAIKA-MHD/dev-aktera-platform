/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Noto Sans Arabic', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        dark: {
          bg: '#0F0F1A',
          card: '#1A1A2E',
          border: '#2D2D4A',
          hover: '#252538',
        },
        player: {
          bg: '#0F0F1A',
          surface: '#1E1E2E',
          primary: '#7C3AED',
        },
        dashboard: {
          panel: '#F9FAFB',
          border: '#E5E7EB',
        },
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'ui-card': '0 8px 30px rgba(15, 23, 42, 0.06)',
        'ui-glow': '0 12px 36px rgba(124, 58, 237, 0.18)',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
};
