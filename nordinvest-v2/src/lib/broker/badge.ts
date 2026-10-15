/*
 * The website badge an agent puts on a listing: options, sizes and the HTML
 * snippet. Shared by the badge image route and the agent's dashboard so the
 * preview and the code are always the same thing.
 */

export const THEMES = { lys: "Lys", moerk: "Mørk", blaa: "Blå" } as const;
export const TEXTS = { analyse: "Se investoranalysen", faa: "Få investoranalysen", tal: "Se flere tal", beregn: "Beregn afkastet" } as const;
export const SIZES = { s: "Lille", m: "Mellem", l: "Stor" } as const;
export const CORNERS = { rund: "Runde", kant: "Kantede" } as const;

export type BadgeOptions = { tema: keyof typeof THEMES; tekst: keyof typeof TEXTS; tal: boolean; str: keyof typeof SIZES; hj: keyof typeof CORNERS };
export const DEFAULT_BADGE: BadgeOptions = { tema: "lys", tekst: "analyse", tal: true, str: "m", hj: "rund" };

const pick = <T extends Record<string, string>>(o: T, v: string | null, d: keyof T): keyof T => (v && v in o ? (v as keyof T) : d);

export function readBadge(sp: URLSearchParams): BadgeOptions {
  return {
    tema: pick(THEMES, sp.get("tema"), DEFAULT_BADGE.tema),
    tekst: pick(TEXTS, sp.get("tekst"), DEFAULT_BADGE.tekst),
    tal: sp.get("tal") !== "0",
    str: pick(SIZES, sp.get("str"), DEFAULT_BADGE.str),
    hj: pick(CORNERS, sp.get("hj"), DEFAULT_BADGE.hj),
  };
}

const SCALE = { s: 0.85, m: 1, l: 1.2 } as const;

/** The badge's size in CSS pixels; the image itself is drawn at twice that for sharp screens. */
export function badgeSize(o: BadgeOptions) {
  const k = SCALE[o.str];
  return { w: Math.round((o.tal ? 312 : 268) * k), h: Math.round((o.tal ? 64 : 54) * k), k };
}

export function badgeQuery(o: BadgeOptions): string {
  return new URLSearchParams({ tema: o.tema, tekst: o.tekst, tal: o.tal ? "1" : "0", str: o.str, hj: o.hj }).toString();
}

export const SITE_URL = "https://nordinvest.io";

export function badgeHtml(slug: string, addr: string, o: BadgeOptions, origin = SITE_URL): string {
  const { w, h } = badgeSize(o);
  const street = addr.split(",")[0].replace(/"/g, "");
  return `<a href="${origin}/e/${slug}" target="_blank" rel="noopener" style="display:inline-block;line-height:0;text-decoration:none"><img src="${origin}/api/badge/${slug}?${badgeQuery(o).replace(/&/g, "&amp;")}" alt="${TEXTS[o.tekst]} for ${street} på NordInvest" width="${w}" height="${h}" style="border:0;max-width:100%;height:auto"></a>`;
}
