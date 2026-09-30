import { DEAL_CITIES, type DealCity } from "@/lib/deal-cities";

/**
 * Split an article's HTML before its n-th <h2>, so the inline "regn på en
 * bolig" box lands after the reader has had the first real section, not in
 * the intro. Short articles (fewer headings) get no inline box.
 */
export function splitBeforeH2(html: string, n = 3): [string, string] | null {
  let idx = -1;
  let from = 0;
  for (let i = 0; i < n; i++) {
    idx = html.indexOf("<h2", from);
    if (idx === -1) return null;
    from = idx + 3;
  }
  return [html.slice(0, idx), html.slice(idx)];
}

/** The Deal-motor city an article is about (title, slug, tags), if any. */
export function articleCity(...texts: (string | string[] | undefined)[]): DealCity | null {
  const hay = texts.flat().filter(Boolean).join(" ").toLowerCase();
  const alias: Record<string, string[]> = { koebenhavn: ["københavn", "koebenhavn", "copenhagen"], aarhus: ["aarhus", "århus"], odense: ["odense", "fyn"] };
  for (const c of DEAL_CITIES) {
    const words = alias[c.slug] ?? [c.name.toLowerCase(), c.slug];
    if (words.some((w) => hay.includes(w))) return c;
  }
  return null;
}
