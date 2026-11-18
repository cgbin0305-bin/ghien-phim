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
          950: "#070b10",
          900: "#0b1119",
          850: "#0f1620",
          800: "#131c27",
          750: "#18232f",
          700: "#1e2b38",
          600: "#2a3948",
          500: "#3b4c5e",
        },
        gold: {
          50: "#fdf8ec",
          100: "#f9eed2",
          200: "#f1dca4",
          300: "#e7c771",
          400: "#d9ae49",
          500: "#c1913a",
          600: "#9d7430",
          700: "#7a5827",
          800: "#573d1d",
          900: "#3a2913",
        },
        jade: {
          100: "#d6efe6",
          300: "#8ccdb6",
          500: "#43a186",
          700: "#2c6b58",
        },
        rouge: {
          100: "#f0c4c3",
          200: "#e79a9a",
          300: "#d97775",
          400: "#c75c58",
          500: "#b8453f",
          600: "#9c3934",
          700: "#8c2f2b",
        },
        /**
         * `mist` là màu chữ phụ (metadata, ghi chú, nhãn nhỏ).
         *
         * Trước đây các chỗ này dùng `ink-500` / `ink-600` — vốn là màu *nền*
         * và viền. Trên nền `ink-950` chúng chỉ đạt tương phản 2.24:1 và
         * 1.67:1, thấp hơn nhiều so với ngưỡng WCAG AA 4.5:1, nên chữ gần như
         * chìm vào background. `mist` là tông xanh xám sáng, đạt 7.6:1 trên nền
         * chính và 6.6:1 trên bề mặt nổi.
         */
        mist: {
          300: "#b3c1d1",
          400: "#9fb2c8",
          500: "#8fa3ba",
        },
        parchment: {
          100: "#f7f3ea",
          200: "#ece4d4",
          300: "#ded4bf",
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
