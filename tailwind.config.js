/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ng: {
          pink: '#FF005A',
          'pink-dark': '#d9004d',
          dark: '#2c2c2c',
          gray: '#f5f5f5',
          'gray-mid': '#666666',
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
