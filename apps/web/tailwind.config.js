/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0a0c14',
          800: '#0f1320',
          700: '#161b2e',
          600: '#1e2440',
        },
        gold: {
          400: '#ffc46b',
          500: '#ffae42',
          600: '#f5921f',
        },
        grape: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cheers: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '30%': { transform: 'rotate(-14deg) scale(1.05)' },
          '60%': { transform: 'rotate(14deg) scale(1.05)' },
          '100%': { transform: 'rotate(0deg) scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out',
        cheers: 'cheers 0.9s ease-in-out',
        'pulse-soft': 'pulse-soft 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
