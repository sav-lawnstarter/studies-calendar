/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ls-green': {
          DEFAULT: '#069C55',
          light: '#0AB463',
          lighter: '#D8F3E6',
          dark: '#057A43',
        },
        'ls-orange': {
          DEFAULT: '#D98E32',
          bright: '#FF9900',
          light: '#FFE4B5',
        },
        'ls-blue': {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
        }
      }
    },
  },
  plugins: [],
}
