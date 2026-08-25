import type { Config } from "tailwindcss";

// NordInvest brand = light + blue (slate/blue/indigo/emerald).
// Legacy token names (navy/gold/cream/stone) are remapped to the new palette so
// every existing page adopts the rebrand without per-file rewrites.
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#0f172a", // slate-900 — dark surfaces, featured card
          800: "#1e293b", // slate-800
          700: "#334155", // slate-700
        },
        gold: {
          400: "#60a5fa", // blue-400
          500: "#2563eb", // blue-600 — primary accent
          600: "#1d4ed8", // blue-700 — hover
        },
        cream: {
          50: "#f8fafc", // slate-50 — page background
          100: "#f1f5f9", // slate-100
        },
        stone: {
          200: "#e2e8f0", // slate-200 — borders
          400: "#94a3b8", // slate-400 — muted
          600: "#475569", // slate-600 — secondary text
          900: "#0f172a", // slate-900 — body text
        },
        data: {
          pos: "#10b981", // emerald-500
          warn: "#f59e0b", // amber-500
          neg: "#f43f5e", // rose-500
        },
      },
      fontFamily: {
        // All roles map to Inter — single bold grotesque brand voice.
        sans: ["var(--font-inter)", "-apple-system", "system-ui", "sans-serif"],
        serif: ["var(--font-inter)", "-apple-system", "system-ui", "sans-serif"],
        mono: ["var(--font-inter)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        micro: "0.12em",
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
