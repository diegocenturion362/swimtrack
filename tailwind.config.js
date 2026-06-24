/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fdfae9',
          100: '#faf3c0',
          200: '#f5e47a',
          300: '#edcd33',
          400: '#e3b810',
          500: '#c9980d',
          600: '#a97409',
          700: '#87540b',
          800: '#6f4310',
          900: '#5e3812',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
