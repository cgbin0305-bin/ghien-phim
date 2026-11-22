import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#080c16",
          900: "#0d1321",
          850: "#11182a",
          800: "#151e32",
          750: "#1c2742",
          700: "#24324d",
          600: "#334568",
          500: "#475d85",
        },
        gold: {
          50: "#fefaf2",
          100: "#fdf0d5",
          200: "#fae0ad",
          300: "#f8ca82",
          400: "#f4b860",
          500: "#d99b3e",
          600: "#b57d29",
          700: "#8c5f1e",
          800: "#634315",
          900: "#3d290d",
        },
        jade: {
          100: "#d5f2e8",
          300: "#72c8ac",
          500: "#3fa384",
          700: "#286b56",
        },
        rouge: {
          100: "#f7cec6",
          200: "#efa698",
          300: "#e77f6b",
          400: "#e05a3e",
          500: "#c84b31",
          600: "#a63a24",
          700: "#852d1b",
        },
        /**
         * `mist` là màu chữ phụ (metadata, ghi chú, nhãn nhỏ) trên nền đêm chàm.
         */
        mist: {
          300: "#c2cddf",
          400: "#a4b1c6",
          500: "#8d9cb5",
        },
        parchment: {
          100: "#f5efe6",
          200: "#e7dfd3",
          300: "#d4c8b8",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.7)",
        lift: "0 2px 6px rgba(0,0,0,0.45), 0 18px 48px -20px rgba(0,0,0,0.85)",
        inset: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
      keyframes: {
        "fade-rise": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "mist-drift": {
          "0%": { transform: "translate3d(-6%, 0, 0)" },
          "100%": { transform: "translate3d(6%, 0, 0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "mist-drift": "mist-drift 26s ease-in-out infinite alternate",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
