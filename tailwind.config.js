/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#566FFF",
          soft: "rgba(86, 111, 255, 0.12)",
          dark: "#3F56D7",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f5f7ff",
        },
        text: {
          primary: "#17213a",
          secondary: "#46506b",
          muted: "#6e7790",
        },
      },
      boxShadow: {
        soft: "0 18px 50px rgba(38, 56, 125, 0.14)",
      },
      borderRadius: {
        lg: "28px",
        md: "18px",
        sm: "12px",
      },
    },
  },
  plugins: [],
};
