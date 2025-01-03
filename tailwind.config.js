/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: "#1c1c28",
        lavender: "#e0afff",
        peachy: "#ffdaab",
        cardbg: "#2c2c3a",
      },
      fontFamily: {
        display: ['var(--font-anton)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
      },
      keyframes: {
        flicker: {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': { opacity: 1 },
          '20%, 24%, 55%': { opacity: 0 },
        },
        fadeInUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        flicker: 'flicker 3s infinite steps(1, start)',
        fadeInUp: 'fadeInUp 1s ease forwards',
      },
    },
  },
  plugins: [],
}
