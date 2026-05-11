/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff8f0',
          100: '#ffe8cc',
          200: '#ffd099',
          300: '#ffb266',
          400: '#ff9433',
          500: '#e67e22',
          600: '#c0671a',
          700: '#9a5014',
          800: '#73390d',
          900: '#4d2507',
        },
      },
    },
  },
  plugins: [],
}

