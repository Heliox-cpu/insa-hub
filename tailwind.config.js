/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/client/index.html',
    './src/client/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        insa: {
          50: '#fef2f2',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa1a1',
          400: '#f86f6f',
          500: '#e30613',
          DEFAULT: '#e30613',
          600: '#c5000c',
          700: '#9b000a',
          800: '#7e0009',
          900: '#630007',
          dark: '#c4121a',
        },
        brand: {
          dark: '#0f172a',
          card: '#1e293b',
          surface: '#334155',
          border: '#475569',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
