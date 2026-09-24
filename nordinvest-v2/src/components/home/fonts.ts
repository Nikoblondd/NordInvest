import { IBM_Plex_Mono, Newsreader } from "next/font/google";

// Landing-page voice: an editorial serif for the thesis lines and a drafting
// mono for the drawing annotations. Scoped to the landing components so the
// rest of the app keeps Inter/Outfit and doesn't pay for these files.
export const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif-display",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500"],
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const drafting = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-drafting",
  display: "swap",
  weight: ["400", "500", "600"],
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});
