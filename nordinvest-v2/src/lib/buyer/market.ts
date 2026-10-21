import { kommuneOf } from "@/lib/postnumre";
import { ZIP_NAME } from "@/lib/postnumre";

/*
 * Server only. The whole residential market for the home buyer's map: every
 * active home for sale (from the market agent's dataset) with a price verdict.
 *
 * The verdict compares the home's asking price per m² with similar homes for
 * sale right now: same type, same size band, in the same postnummer (or the
 * kommune, or the country when there are too few). It is a comparison with
 * other asking prices, not with sold prices, and the detail view says so.
 * A price cut and the energy label move the score a little.
 */

const URL_BASE = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Type groups the buyer filters by. Andelsboliger are priced differently and never compared with ejerlejligheder. */
export const TYPE_LABEL: Record<string, string> = {
  condo: "Ejerlejlighed",
  villa: "Villa",
  "terraced house": "Rækkehus",
  cooperative: "Andelsbolig",
  "holiday house": "Fritidshus",
  farm: "Landejendom",
  "villa apartment": "Villalejlighed",
};
const GROUP: Record<string, string> = { "villa apartment": "condo" };
const groupOf = (t: string) => GROUP[t] ?? t;

const BANDS = [55, 80, 110, 150];
const bandOf = (area: number) => { let i = 0; while (i < BANDS.length && area >= BANDS[i]) i++; return i; };
const BAND_LABEL = ["under 55 m²", "55-80 m²", "80-110 m²", "110-150 m²", "over 150 m²"];

export type Verdict = "godt" | "middel" | "dyrt";

/** One home on the map. Kept small: 26.000 of them go to the browser in one response. */
export type BuyerHome = {
  id: string;
  lat: number;
  lon: number;
  price: number;
  area: number;
  rooms: number | null;
  year: number | null;
  energy: string | null;
  type: string;
  zip: number;
  kommune: string | null;
  address: string;
  /** Asking price per m². */
  ppm: number;
  /** Expected price per m² for a home like this here. */
  expPpm: number;
  /** % over (+) or under (−) the expected price. */
  deltaPct: number;
  /** Share of similar homes (%) that cost less per m² than this one. 20 means cheaper than 80 % of them. */
  rank: number;
  /** 0-100, higher is a better buy. */
  score: number;
  verdict: Verdict;
  /** Total price cut since first listed, % (positive = cheaper). */
  cutPct: number;
  firstSeen: string;
  /** True when the dataset saw it come on the market (not part of the first sweep). */
  knownStart: boolean;
  /** The price is so far from the area that the ad is probably wrong (area, an andel listed as ejerlejlighed, a houseboat). Shown as middle, never as a top buy. */
  suspect: boolean;
};

export type Basis = { level: "naer" | "postnummer" | "kommune" | "landet"; radiusKm?: number; n: number; band: string; median: number; q1: number; q3: number; place: string; sorted?: number[]; adj?: number };

type Row = {
  id: string; lat: number | null; lon: number | null; price: number | null; area: number | null; rooms: number | null;
  year_built: number | null; energy_label: string | null; type: string | null; zip: number | null; municipality: string | null;
  address: string | null; first_seen: string | null; price_history: { d: string; price: number }[] | null;
};

const median = (s: number[]) => quantile(s, 0.5);
/** How many values in a sorted list are below v. */
function below(sorted: number[], v: number) { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; } return lo; }
function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q, b = Math.floor(pos), r = pos - b;
  return sorted[b + 1] != null ? sorted[b] + r * (sorted[b + 1] - sorted[b]) : sorted[b];
}

async function fetchRows(): Promise<Row[] | null> {
  if (!URL_BASE() || !KEY()) return null;
  const cols = "id,lat,lon,price,area,rooms,year_built,energy_label,type,zip,municipality,address,first_seen,price_history";
  const headers = { apikey: KEY(), Authorization: `Bearer ${KEY()}` };
  const page = async (offset: number) => {
    const r = await fetch(`${URL_BASE()}/rest/v1/market_listings?market=eq.bolig&status=neq.gone&select=${cols}&order=id.asc&limit=1000&offset=${offset}`, { headers, cache: "no-store" }).catch(() => null);
    return r?.ok ? ((await r.json()) as Row[]) : null;
  };
  const head = await fetch(`${URL_BASE()}/rest/v1/market_listings?market=eq.bolig&status=neq.gone&select=id&limit=1`, { headers: { ...headers, Prefer: "count=exact" }, cache: "no-store" }).catch(() => null);
  const total = Number(head?.headers.get("content-range")?.split("/")[1]);
  if (!Number.isFinite(total)) return null;
  const offsets: number[] = [];
  for (let o = 0; o < Math.min(total, 60000); o += 1000) offsets.push(o);
  const pages = await Promise.all(offsets.map(page));
  if (pages.some((p) => p == null)) return null;
  return pages.flat() as Row[];
}

type Group = { sorted: number[] };
export type Market = { homes: BuyerHome[]; byId: Map<string, BuyerHome>; groups: Map<string, Group>; bandFactor: Map<string, number>; basis: Map<string, Basis>; builtAt: number; baseline: string };

let cache: { at: number; market: Market } | null = null;
let inflight: Promise<Market | null> | null = null;
const TTL = 15 * 60 * 1000;

export async function getMarket(): Promise<Market | null> {
  if (cache && Date.now() - cache.at < TTL) return cache.market;
  if (!inflight) {
    inflight = (async () => {
      const rows = await fetchRows();
      if (!rows) return cache?.market ?? null;
      const market = build(rows);
      cache = { at: Date.now(), market };
      return market;
    })().finally(() => { inflight = null; });
  }
  return inflight;
}

function plausible(r: Row): boolean {
  if (r.lat == null || r.lon == null || !r.price || !r.area) return false;
  const t = r.type ?? "";
  if (r.area < 15 || r.area > (t === "farm" ? 1500 : 450)) return false;
  if (r.price < 150_000) return false;
  const ppm = r.price / r.area;
  return ppm >= (t === "farm" || t === "holiday house" || t === "cooperative" ? 800 : 3000) && ppm <= 250_000;
}

function build(rows: Row[]): Market {
  const ok = rows.filter(plausible);
  const groups = new Map<string, number[]>();
  const add = (k: string, v: number) => { const a = groups.get(k); if (a) a.push(v); else groups.set(k, [v]); };
  for (const r of ok) {
    const g = groupOf(r.type ?? ""), b = bandOf(r.area!), ppm = r.price! / r.area!;
    const k = kommuneOf(r.zip, r.municipality) ?? "?";
    add(`z|${r.zip}|${g}|${b}`, ppm); add(`z|${r.zip}|${g}`, ppm);
    add(`k|${k}|${g}|${b}`, ppm); add(`k|${k}|${g}`, ppm);
    add(`n|${g}|${b}`, ppm); add(`n|${g}`, ppm);
  }
  const sortedGroups = new Map<string, Group>();
  groups.forEach((v, k) => sortedGroups.set(k, { sorted: v.sort((a, b) => a - b) }));
  // How much more (or less) a m² costs in each size band than the type's median, nationally.
  const bandFactor = new Map<string, number>();
  for (const g of Array.from(new Set(ok.map((r) => groupOf(r.type ?? ""))))) {
    const all = median(sortedGroups.get(`n|${g}`)?.sorted ?? []);
    for (let b = 0; b <= BANDS.length; b++) {
      const m = median(sortedGroups.get(`n|${g}|${b}`)?.sorted ?? []);
      bandFactor.set(`${g}|${b}`, all > 0 && m > 0 ? m / all : 1);
    }
  }
  // A grid of the homes per type group, for finding the nearest similar homes fast.
  const CELL = 0.02;
  const grid = new Map<string, number[]>();
  ok.forEach((r, i) => {
    const key = `${groupOf(r.type ?? "")}|${Math.floor(Number(r.lat) / CELL)}|${Math.floor(Number(r.lon) / CELL)}`;
    const a = grid.get(key); if (a) a.push(i); else grid.set(key, [i]);
  });
  /*
   * The fairest comparison for a buyer is the homes around it: same type,
   * a similar size (two thirds to one and a half times the area), as close
   * as possible. Start within 1,5 km and widen to 12 km until there are at
   * least 8. Postnumre are coarse (2000 Frederiksberg runs from the lakes to
   * Valby), so this beats a postnummer average.
   */
  const near = (i: number): Basis | null => {
    const r = ok[i], g = groupOf(r.type ?? ""), lat = Number(r.lat), lon = Number(r.lon), area = Number(r.area);
    const cos = Math.cos((lat * Math.PI) / 180), cy = Math.floor(lat / CELL), cx = Math.floor(lon / CELL);
    for (const km of [1.5, 3, 6, 12]) {
      const dy = Math.ceil(km / (111 * CELL)), dx = Math.ceil(km / (111 * cos * CELL));
      const ppms: number[] = [];
      for (let y = cy - dy; y <= cy + dy; y++) for (let x = cx - dx; x <= cx + dx; x++) {
        for (const j of grid.get(`${g}|${y}|${x}`) ?? []) {
          if (j === i) continue;
          const o = ok[j], oa = Number(o.area);
          if (oa < area / 1.5 || oa > area * 1.5) continue;
          if (Math.hypot((Number(o.lat) - lat) * 111, (Number(o.lon) - lon) * 111 * cos) > km) continue;
          ppms.push(o.price! / oa);
        }
      }
      if (ppms.length >= 8) {
        ppms.sort((a, b) => a - b);
        return { level: "naer", radiusKm: km, n: ppms.length, band: `${Math.round(area / 1.5)}-${Math.round(area * 1.5)} m²`, median: median(ppms), q1: quantile(ppms, 0.25), q3: quantile(ppms, 0.75), place: `inden for ${String(km).replace(".", ",")} km`, sorted: ppms, adj: 1 };
      }
    }
    return null;
  };
  const basisById = new Map<string, Basis>();

  const baseline = ok.reduce((min, r) => (r.first_seen && r.first_seen < min ? r.first_seen : min), "9999");
  const baseDay = Date.parse(baseline);

  const homes: BuyerHome[] = ok.map((r, i) => {
    const g = groupOf(r.type ?? ""), area = Number(r.area), price = Number(r.price), ppm = price / area;
    const kom = kommuneOf(r.zip, r.municipality);
    const basis = near(i) ?? expected(sortedGroups, bandFactor, r.zip ?? 0, kom ?? "?", g, bandOf(area));
    { const { sorted: _s, adj: _a, ...b } = basis; basisById.set(r.id, b); } // eslint-disable-line @typescript-eslint/no-unused-vars
    const exp = basis.median;
    const deltaPct = exp > 0 ? (ppm / exp - 1) * 100 : 0;
    const rank = basis.sorted && basis.sorted.length > 1 ? (below(basis.sorted, ppm / (basis.adj || 1)) / basis.sorted.length) * 100 : 50;
    const hist = Array.isArray(r.price_history) ? r.price_history : [];
    const first = hist.length ? Number(hist[0].price) : price;
    const cutPct = first > 0 && first > price ? ((first - price) / first) * 100 : 0;
    // Asking prices per m² spread widely within a postnummer (condition, plot,
    // view), so the verdict is the home's place among similar homes: the
    // cheapest quarter is a good buy, the dearest quarter is expensive.
    // A price cut of up to 10 % and the energy label move it a little.
    let score = 100 - rank + Math.min(cutPct, 10) * 0.8;
    // Very far from the middle is less certain (a kolonihavehus, a ruin, a typo), so it ranks below a solid 20 % discount.
    score -= Math.max(0, Math.abs(deltaPct) - 30) * 0.6;
    const e = (r.energy_label ?? "").toUpperCase();
    if (e.startsWith("A")) score += 3; else if (e === "F" || e === "G") score -= 4;
    score = Math.max(3, Math.min(97, Math.round(score)));
    // Far under or over similar homes is almost always an error in the ad (area, an andel or a houseboat listed as ejerlejlighed), not a bargain.
    const tight = g === "condo" || g === "terraced house";
    const suspect = tight ? deltaPct < -38 || deltaPct > 80 : deltaPct < -55 || deltaPct > 130;
    if (suspect) score = 50;
    const firstSeen = r.first_seen ?? baseline;
    return {
      id: r.id, lat: Number(r.lat), lon: Number(r.lon), price, area, rooms: r.rooms, year: r.year_built,
      energy: r.energy_label ? e : null, type: r.type ?? "villa", zip: r.zip ?? 0, kommune: kom,
      address: r.address ?? "", ppm: Math.round(ppm), expPpm: Math.round(exp), deltaPct: Math.round(deltaPct * 10) / 10,
      rank: Math.round(rank), score, verdict: score >= 74 ? "godt" : score > 26 ? "middel" : "dyrt",
      cutPct: Math.round(cutPct * 10) / 10, firstSeen, knownStart: Date.parse(firstSeen) - baseDay > 2 * 86400_000, suspect,
    };
  });
  return { homes, byId: new Map(homes.map((h) => [h.id, h])), groups: sortedGroups, bandFactor, basis: basisById, builtAt: Date.now(), baseline };
}

function expected(groups: Map<string, Group>, bandFactor: Map<string, number>, zip: number, kom: string, g: string, b: number): Basis {
  const f = bandFactor.get(`${g}|${b}`) ?? 1;
  const pick = (key: string, adj: number, level: Basis["level"], place: string, min: number): Basis | null => {
    const s = groups.get(key)?.sorted;
    if (!s || s.length < min) return null;
    return { level, n: s.length, band: BAND_LABEL[b], median: median(s) * adj, q1: quantile(s, 0.25) * adj, q3: quantile(s, 0.75) * adj, place, sorted: s, adj };
  };
  const zipName = ZIP_NAME[zip] ? `${zip} ${ZIP_NAME[zip]}` : String(zip);
  return (
    pick(`z|${zip}|${g}|${b}`, 1, "postnummer", zipName, 6) ??
    pick(`z|${zip}|${g}`, f, "postnummer", zipName, 6) ??
    pick(`k|${kom}|${g}|${b}`, 1, "kommune", kom, 6) ??
    pick(`k|${kom}|${g}`, f, "kommune", kom, 5) ??
    pick(`n|${g}|${b}`, 1, "landet", "hele landet", 1) ??
    { level: "landet", n: 0, band: BAND_LABEL[b], median: 0, q1: 0, q3: 0, place: "hele landet" }
  );
}

/** What a home's verdict is measured against, for the detail view. */
export function basisFor(m: Market, h: BuyerHome): Basis {
  const b = m.basis.get(h.id);
  if (b) return b;
  const { sorted: _s, adj: _a, ...rest } = expected(m.groups, m.bandFactor, h.zip, h.kommune ?? "?", groupOf(h.type), bandOf(h.area)); // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

/** The homes compared with, for the detail view: same type and band, nearest first. */
export function nearbySimilar(m: Market, h: BuyerHome, n = 8): BuyerHome[] {
  const g = groupOf(h.type);
  const d = (x: BuyerHome) => (x.lat - h.lat) ** 2 + ((x.lon - h.lon) * Math.cos((h.lat * Math.PI) / 180)) ** 2;
  return m.homes
    .filter((x) => x.id !== h.id && groupOf(x.type) === g && x.area >= h.area / 1.5 && x.area <= h.area * 1.5 && Math.abs(x.lat - h.lat) < 0.2 && Math.abs(x.lon - h.lon) < 0.35)
    .sort((a, c) => d(a) - d(c))
    .slice(0, n);
}
