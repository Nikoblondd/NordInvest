import { unstable_cache } from "next/cache";
import { readBoligDeals } from "@/lib/portals/marketdb";
import { analyzeDeal, isPlausible, sortDeals, type AnalyzedDeal } from "@/lib/deals";
import { dealHref } from "@/lib/deal-links";
import { MUNICIPALITIES, zipToMunicipality } from "@/lib/kommuner";
import { ALL_DEAL_CITIES } from "@/lib/deal-cities";

/*
 * NordInvest Udlejerindeks: every kommune ranked by the share of year-round
 * homes for sale whose rent covers the loan and running costs (20 % down, 5 %
 * interest, estimated market rent), the same sums as the Deal-motor. A kommune
 * needs MIN_SCANNED homes for sale to be ranked. Kommuner with the same share
 * share a place, so the 20-odd kommuner where no home gives plus are all last.
 * Computed live (cached 6 hours); the 1st of each month is stored as the
 * official reading so the page can show the change since last month.
 */

export const MIN_SCANNED = 40;
const HOME_TYPES = ["condo", "villa", "terraced house"];
const BOLIG = { downPaymentPct: 20, interestRate: 5, rentFactor: 1, strategy: "cashflow" as const };

export type IndexBest = { address: string; city: string; price: number; area: number | null; cashFlow: number; href: string };
export type IndexRow = {
  slug: string;
  name: string;
  scanned: number;
  positive: number;
  share: number;
  medianM2: number | null;
  rank: number | null;
  page: boolean; // has its own /deals/<slug> page
  best: IndexBest | null;
};
export type Udlejerindeks = {
  updated: string;
  scanned: number;
  positive: number;
  ranked: number;
  zero: number;
  rows: IndexRow[]; // ranked rows first, best first; then the unranked
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function build(): Promise<Udlejerindeks | null> {
  const batches = await Promise.all(HOME_TYPES.map((type) => readBoligDeals({ type, limit: 15000 })));
  const homes = batches.flatMap((b) => b ?? []);
  if (!homes.length) return null;
  const by = new Map<string, AnalyzedDeal[]>();
  for (const l of homes) {
    const slug = l.municipality || zipToMunicipality(l.zip);
    if (!slug) continue;
    const d = analyzeDeal(l, BOLIG);
    // Same plausibility filter as deals-snapshot, so the counts here match the
    // kommune pages.
    if (!d || !isPlausible(d)) continue;
    (by.get(slug) ?? by.set(slug, []).get(slug)!).push(d);
  }
  const pages = new Set(ALL_DEAL_CITIES.map((c) => c.slug));
  const rows: IndexRow[] = MUNICIPALITIES.filter((k) => by.has(k.slug)).map((k) => {
    const ds = by.get(k.slug)!;
    const pos = ds.filter((d) => d.cashFlow > 0);
    const top = sortDeals(pos, "score")[0];
    return {
      slug: k.slug,
      name: k.name,
      scanned: ds.length,
      positive: pos.length,
      share: pos.length / ds.length,
      medianM2: median(ds.filter((d) => d.area).map((d) => d.price / (d.area as number))),
      rank: null,
      page: pages.has(k.slug),
      best: top
        ? { address: top.address, city: top.city, price: top.price, area: top.area, cashFlow: top.cashFlow, href: dealHref(top, "20", "5") }
        : null,
    };
  });
  const ranked = rows.filter((r) => r.scanned >= MIN_SCANNED).sort((a, b) => b.share - a.share || b.positive - a.positive);
  for (const r of ranked) r.rank = 1 + ranked.filter((o) => o.share > r.share + 1e-9).length;
  const rest = rows.filter((r) => r.scanned < MIN_SCANNED).sort((a, b) => b.share - a.share);
  const all = [...ranked, ...rest];
  return {
    updated: new Date().toISOString(),
    scanned: all.reduce((s, r) => s + r.scanned, 0),
    positive: all.reduce((s, r) => s + r.positive, 0),
    ranked: ranked.length,
    zero: ranked.filter((r) => r.positive === 0).length,
    rows: all,
  };
}

export const getUdlejerindeks = unstable_cache(build, ["udlejerindeks-v2"], { revalidate: 21600 });

/* ---------- monthly readings (Supabase table udlejerindeks_maalinger) ---------- */

export type Reading = { month: string; rows: { slug: string; rank: number | null; share: number; positive: number; scanned: number }[] };

const db = () => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return base && key ? { base, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } } : null;
};

/** The latest stored reading from before `month` (YYYY-MM), if the table exists. */
export async function previousReading(month: string): Promise<Reading | null> {
  const c = db();
  if (!c) return null;
  const rows = await fetch(`${c.base}/rest/v1/udlejerindeks_maalinger?select=month,rows&month=lt.${month}&order=month.desc&limit=1`, {
    headers: c.headers,
    next: { revalidate: 3600 },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return Array.isArray(rows) && rows[0] ? (rows[0] as Reading) : null;
}

export async function storeReading(month: string, idx: Udlejerindeks): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const rows = idx.rows.map((r) => ({ slug: r.slug, rank: r.rank, share: r.share, positive: r.positive, scanned: r.scanned }));
  const res = await fetch(`${c.base}/rest/v1/udlejerindeks_maalinger?on_conflict=month`, {
    method: "POST",
    headers: { ...c.headers, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ month, rows, scanned: idx.scanned, positive: idx.positive }),
  }).catch(() => null);
  return !!res?.ok;
}

export const pct = (s: number) => (s > 0 && s < 0.005 ? "under 1" : Math.round(s * 100).toString());
export const dkn = (n: number) => Math.round(n).toLocaleString("da-DK");
export const monthKey = (d = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit" }).format(d);
