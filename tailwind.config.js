/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // brand palette
        midnight: "#1c1c28",
        lavender: "#e0afff",
        peachy: "#ffdaab",
        cardbg: "#2c2c3a",
      },
      fontFamily: {
        sans: ["Open Sans", "sans-serif"],
        display: ["Montserrat", "sans-serif"],
      },
      keyframes: {
        glitch: {
          "0%": { clip: "rect(54px,9999px,56px,0)", transform: "skew(0.3deg)" },
          "5%": { clip: "rect(12px,9999px,29px,0)", transform: "skew(0.8deg)" },
          "10%": { clip: "rect(30px,9999px,77px,0)", transform: "skew(0.2deg)" },
          "15%": { clip: "rect(40px,9999px,60px,0)", transform: "skew(0.3deg)" },
          "20%": { clip: "rect(1px,9999px,85px,0)", transform: "skew(0.9deg)" },
          "100%": { clip: "rect(54px,9999px,56px,0)", transform: "skew(0.3deg)" },
        },
        gradientflow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        glitch: "glitch 2s infinite",
        gradientflow: "gradientflow 10s ease infinite",
      },
    },
  },
  plugins: [],
}

