import type { BuyerHome } from "./market";
import type { Filters, Sort } from "./state";

/** Type ids per filter chip. "condo" also covers villalejligheder. */
export const TYPE_CHIPS: { id: string; label: string; types: string[] }[] = [
  { id: "lejlighed", label: "Lejlighed", types: ["condo", "villa apartment"] },
  { id: "villa", label: "Villa", types: ["villa"] },
  { id: "raekkehus", label: "Rækkehus", types: ["terraced house"] },
  { id: "andel", label: "Andelsbolig", types: ["cooperative"] },
  { id: "fritid", label: "Fritidshus", types: ["holiday house"] },
  { id: "land", label: "Landejendom", types: ["farm", "hobby farm"] },
];

const DAY = 86400_000;

/** Is a point inside a drawn area? (Ray casting; points are [lon, lat].) */
export function inShape(lon: number, lat: number, shape: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [xi, yi] = shape[i], [xj, yj] = shape[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Does a home match the filters? `newSince` decides what "Nye" means (default: the last 7 days). */
export function matches(h: BuyerHome, f: Filters, newSince = Date.now() - 7 * DAY): boolean {
  if (f.types.length) {
    const ok = TYPE_CHIPS.filter((c) => f.types.includes(c.id)).some((c) => c.types.includes(h.type));
    if (!ok) return false;
  }
  if (f.priceMin != null && h.price < f.priceMin) return false;
  if (f.priceMax != null && h.price > f.priceMax) return false;
  if (f.areaMin != null && h.area < f.areaMin) return false;
  if (f.roomsMin != null && (h.rooms == null || h.rooms < f.roomsMin)) return false;
  if (f.verdicts.length && !f.verdicts.includes(h.verdict)) return false;
  if (f.onlyCut && h.cutPct <= 0) return false;
  if (f.onlyNew && !(h.knownStart && Date.parse(h.firstSeen) >= newSince)) return false;
  if (f.shape && f.shape.length >= 3 && !inShape(h.lon, h.lat, f.shape)) return false;
  return true;
}

export function compare(sort: Sort): (a: BuyerHome, b: BuyerHome) => number {
  switch (sort) {
    case "billigst": return (a, b) => a.price - b.price;
    case "dyrest": return (a, b) => b.price - a.price;
    case "prisfald": return (a, b) => b.cutPct - a.cutPct || b.score - a.score;
    case "nyeste": return (a, b) => b.firstSeen.localeCompare(a.firstSeen) || b.score - a.score;
    case "m2": return (a, b) => a.ppm - b.ppm;
    case "stoerst": return (a, b) => b.area - a.area;
    default: return (a, b) => b.score - a.score || a.deltaPct - b.deltaPct;
  }
}

/** True when the filters narrow anything at all. */
export const hasFilters = (f: Filters) => !!(f.shape?.length || f.types.length || f.priceMin != null || f.priceMax != null || f.areaMin != null || f.roomsMin != null || f.verdicts.length || f.onlyCut || f.onlyNew);
