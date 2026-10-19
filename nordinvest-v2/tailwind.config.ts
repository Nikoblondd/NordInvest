import type { Config } from "tailwindcss";

// NordInvest brand = paper + ink navy (see the blue/slate remap below).
// Legacy token names (navy/gold/cream/stone) are remapped to the new palette so
// every existing page adopts the rebrand without per-file rewrites.
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Oct 2026 redesign: Tailwind's default blue and cool slate read as
        // "AI-generated SaaS". Blue becomes NordInvest's ink navy (buttons,
        // links, focus) and slate a warm neutral that darkens into the same
        // ink, on a paper canvas. Green, amber and rose keep their meaning
        // (good / watch / bad) and are never used as decoration.
        blue: {
          50: "#f1f3f7", 100: "#e2e6ee", 200: "#c6cedd", 300: "#9eabc4", 400: "#6f80a3",
          500: "#4a5c82", 600: "#25345a", 700: "#1d2a4b", 800: "#18233f", 900: "#141d34", 950: "#0c1222",
        },
        slate: {
          50: "#f7f8fa", 100: "#f0f2f5", 200: "#e4e7ec", 300: "#cfd4dc", 400: "#9aa2af",
          500: "#6b7280", 600: "#4b5262", 700: "#343c4f", 800: "#232b40", 900: "#17213a", 950: "#0d1426",
        },
        paper: "#ffffff",
        // The one accent (design.md): Danish red brick. Footnote marks and links only, < 5 % of a view.
        brick: { 600: "#9a3b26", 700: "#7e2f1e" },
        navy: {
          900: "#17213a", // ink — dark surfaces, featured card
          800: "#272e42",
          700: "#3c4153",
        },
        gold: {
          400: "#6f80a3",
          500: "#25345a", // ink — primary accent
          600: "#1d2a4b", // hover
        },
        cream: {
          50: "#ffffff", // page background
          100: "#f5f6f8",
        },
        stone: {
          200: "#e4e7ec", // borders
          400: "#9aa2af", // muted
          600: "#4b5262", // secondary text
          900: "#17213a", // body text
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
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["var(--font-display)", "var(--font-inter)", "-apple-system", "system-ui", "sans-serif"],
        // Landing page only (see components/home/fonts.ts).
        thesis: ["var(--font-serif-display)", "Georgia", "Times New Roman", "serif"],
        geist: ["var(--font-geist)", "-apple-system", "system-ui", "sans-serif"],
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
