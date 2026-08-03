/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Sistema tipográfico en sintonía: Space Grotesk (display) + Inter (texto)
        // + JetBrains Mono (capa técnica de la landing: eyebrows, códigos, cifras).
        display: ['"Space Grotesk"', '"Inter"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
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
        // Entradas de la landing (lenguaje "ease-out-expo").
        "fade-up": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
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
      },
      animation: {
        "orbit-spin": "orbit-spin 18s linear infinite",
        "orbit-spin-slow": "orbit-spin 32s linear infinite",
        "orbit-spin-rev": "orbit-spin-rev 24s linear infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        float: "float 7s ease-in-out infinite",
        "drift-1": "drift-1 16s ease-in-out infinite",
        "drift-2": "drift-2 20s ease-in-out infinite",
        "fade-up": "fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scale-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      transitionTimingFunction: {
        expo: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
