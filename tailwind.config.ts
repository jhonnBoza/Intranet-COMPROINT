import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Azul acero corporativo — identidad COMPROINT (no el azul default de Tailwind)
        brand: {
          50: "#eef3f9",
          100: "#d8e5f1",
          200: "#b3cbe3",
          300: "#82a8ce",
          400: "#5285b5",
          500: "#326a9b",
          600: "#235684",
          700: "#1d4870",
          800: "#1a3c5c",
          900: "#172f47",
          950: "#0f1f30",
        },
        // Dorado corporativo — acento de marca (del logo), usar con moderación
        gold: {
          50: "#fdf9ec",
          100: "#faf0cc",
          200: "#f5df95",
          300: "#efc958",
          400: "#eab308",
          500: "#d29405",
          600: "#b57c05",
          700: "#8f6009",
          800: "#764e10",
          900: "#644111",
        },
        // Chrome oscuro (sidebar / barras)
        ink: {
          700: "#1e2a3a",
          800: "#16202e",
          900: "#0f1826",
          950: "#0a111c",
        },
        // Estados documentales (verde / ámbar / rojo)
        estado: {
          vigente: "#15803d",
          revision: "#b45309",
          obsoleto: "#b91c1c",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Roboto", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)",
        panel: "0 4px 12px -2px rgb(16 24 40 / 0.08), 0 2px 6px -2px rgb(16 24 40 / 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
