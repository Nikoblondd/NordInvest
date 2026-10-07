/*
 * The renovation plan: ten parts of a home, each kept, refreshed or replaced.
 * The AI photo check proposes it, the user decides, and the budget is built
 * from it with real prices. Shared by the API route and the page.
 */

export const ELEMENTS = ["vaegge", "gulve", "doere", "koekken", "bad", "el", "varme", "vinduer", "tag", "facade"] as const;
export type Element = (typeof ELEMENTS)[number];
export type Action = "keep" | "refresh" | "replace" | "unseen";
export type Plan = Record<Element, Action>;
export type Level = "cosmetic" | "medium" | "total";

export const ELEMENT_LABEL: Record<Element, string> = {
  vaegge: "Vægge og lofter",
  gulve: "Gulve",
  doere: "Indvendige døre",
  koekken: "Køkken",
  bad: "Badeværelse",
  el: "El",
  varme: "Varme og vand",
  vinduer: "Vinduer",
  tag: "Tag",
  facade: "Facade",
};

export const ACTION_LABEL: Record<Exclude<Action, "unseen">, string> = { keep: "Behold", refresh: "Opfrisk", replace: "Udskift" };

export function defaultPlan(level: Level): Plan {
  const base: Plan = { vaegge: "refresh", gulve: "replace", doere: "keep", koekken: "keep", bad: "keep", el: "keep", varme: "keep", vinduer: "keep", tag: "keep", facade: "keep" };
  if (level === "cosmetic") return { ...base, koekken: "refresh", bad: "refresh" };
  if (level === "medium") return { ...base, vaegge: "replace", doere: "replace", koekken: "replace", bad: "replace", el: "refresh" };
  return { ...base, vaegge: "replace", doere: "replace", koekken: "replace", bad: "replace", el: "replace", varme: "replace", vinduer: "replace", facade: "refresh" };
}

/** The AI's view, with what it could not see filled in from the chosen level. */
export function planFromCondition(elements: Partial<Record<Element, { action: Action }>>, level: Level): Plan {
  const d = defaultPlan(level);
  const out = { ...d };
  for (const e of ELEMENTS) {
    const a = elements[e]?.action;
    if (a && a !== "unseen") out[e] = a;
  }
  return out;
}

export type Condition = {
  overall: number;
  level: Level;
  summary: string | null;
  elements: Record<Element, { action: Action; note: string }>;
  warnings: string[];
  confidence: number;
};
