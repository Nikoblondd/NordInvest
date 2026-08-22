import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0F1F3D",
          800: "#1A2D52",
          700: "#2A3F6B",
        },
        gold: {
          400: "#D4AF75",
          500: "#B8935A",
          600: "#9B7B48",
        },
        cream: {
          50: "#FAF7F2",
          100: "#F1EBE0",
        },
        stone: {
          200: "#E7E1D6",
          400: "#A8A29E",
          600: "#57534E",
          900: "#1C1917",
        },
        data: {
          pos: "#10B981",
          warn: "#F59E0B",
          neg: "#F43F5E",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      letterSpacing: {
        micro: "0.2em",
      },
      maxWidth: {
        "7xl": "80rem",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.4,0,0.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
