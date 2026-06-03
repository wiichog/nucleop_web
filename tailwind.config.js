/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Sistema tipográfico en sintonía: Space Grotesk (display) + Inter (texto).
        display: ['"Space Grotesk"', '"Inter"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        // Paleta Nucleo — negro profundo + naranja incendiario (energía fitness/Strava).
        nucleo: {
          black: "#000000",
          void: "#050505",
          ink: "#0a0a0b", // negro base
          carbon: "#101012", // superficies
          flame: "#FC4C02", // primario (naranja)
          coral: "#FF7A3D", // acento (coral)
          amber: "#FF9F1C", // secundario cálido
          crimson: "#FF2D55", // contraste/pop
        },
      },
      keyframes: {
        "orbit-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "orbit-spin-rev": {
          from: { transform: "rotate(360deg)" },
          to: { transform: "rotate(0deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        "radio-pulse": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.95", transform: "scale(1.12)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "drift-1": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(6%, -4%) scale(1.12)" },
        },
        "drift-2": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-5%, 5%) scale(1.1)" },
        },
        "snow-fall": {
          "0%": { transform: "translateY(-8vh) translateX(0)", opacity: "0" },
          "12%": { opacity: "1" },
          "88%": { opacity: "1" },
          "100%": { transform: "translateY(108vh) translateX(24px)", opacity: "0" },
        },
      },
      animation: {
        "orbit-spin": "orbit-spin 18s linear infinite",
        "orbit-spin-slow": "orbit-spin 32s linear infinite",
        "orbit-spin-rev": "orbit-spin-rev 24s linear infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "radio-pulse": "radio-pulse 3.5s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        "drift-1": "drift-1 16s ease-in-out infinite",
        "drift-2": "drift-2 20s ease-in-out infinite",
        "snow-fall": "snow-fall linear infinite",
      },
    },
  },
  plugins: [],
};
