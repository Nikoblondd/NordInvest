import localFont from "next/font/local";
import { Instrument_Serif } from "next/font/google";

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

export const geist = localFont({
  src: "./font-files/Geist-latin.woff2",
  variable: "--font-geist",
  display: "swap",
  weight: "100 900",
  fallback: ["-apple-system", "system-ui", "Segoe UI", "sans-serif"],
});
