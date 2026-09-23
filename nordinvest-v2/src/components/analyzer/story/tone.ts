// One semantic scale for the whole analysis story: green = works, amber = check
// it, red = doesn't work, slate = no opinion. Every coloured dot, ring and
// answer chip on the page resolves through these maps so colour always means
// the same thing.
export type Tone = "good" | "warn" | "bad" | "neutral";

export const toneDot: Record<Tone, string> = {
  good: "bg-emerald-400",
  warn: "bg-amber-400",
  bad: "bg-rose-400",
  neutral: "bg-slate-400",
};

/** SVG stroke for rings on dark surfaces. */
export const toneRing: Record<Tone, string> = {
  good: "stroke-emerald-400",
  warn: "stroke-amber-400",
  bad: "stroke-rose-400",
  neutral: "stroke-slate-300",
};

/** Text on dark surfaces. */
export const toneText: Record<Tone, string> = {
  good: "text-emerald-300",
  warn: "text-amber-300",
  bad: "text-rose-300",
  neutral: "text-slate-300",
};

/** Answer chip on light surfaces. */
export const toneChip: Record<Tone, string> = {
  good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warn: "bg-amber-50 text-amber-900 ring-amber-200",
  bad: "bg-rose-50 text-rose-800 ring-rose-200",
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
};

/** Solid dot on light surfaces (chapter nav, legends). */
export const toneDotLight: Record<Tone, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-rose-500",
  neutral: "bg-slate-400",
};

/** Numbers on light surfaces. */
export const toneNum: Record<Tone, string> = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-rose-600",
  neutral: "text-slate-900",
};
