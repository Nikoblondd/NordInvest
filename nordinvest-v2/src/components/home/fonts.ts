import { IBM_Plex_Sans, Instrument_Serif } from "next/font/google";

// Landing-page type: Instrument Serif for headlines (upright only) and Geist
// for everything else, including the numbers. Both open-source (OFL). Geist
// is self-hosted because this Next version's Google list predates it.
export const serif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif-display",
  display: "swap",
  weight: "400",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

// The app, analyser and public pages set text through --font-geist. Since the
// Oct 2026 redesign (design.md) that variable carries IBM Plex Sans, the same
// body face as the rest of the site; the export keeps its old name so no call
// site changes.
export const geist = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  fallback: ["-apple-system", "system-ui", "Segoe UI", "sans-serif"],
});
