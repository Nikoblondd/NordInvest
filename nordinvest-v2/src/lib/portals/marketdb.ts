// Reads the market dataset the local agent keeps fresh (public.market_listings)
// and maps it back into the shapes the deal engine already understands. When the
// agent has populated the table, the deal-motor serves from here — so everything
// the agent scrapes (all residential types + investment/erhverv, deduped, with
// images) is live on the platform the moment it syncs. Falls back to live portal
// fetching when the table is empty or unreachable.

import { etImage } from "./ejendomstorvet";
import type { DealListing } from "@/lib/deals";
import type { InvestmentListing } from "@/lib/portals/ejendomstorvet";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function marketDbConfigured(): boolean {
  return Boolean(URL_BASE && KEY);
}

function host(url: string | null | undefined): string {
  if (!url) return "boligsiden.dk";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "boligsiden.dk";
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function queryPage(params: string, withCount = false): Promise<{ rows: any[]; total: number | null } | null> {
  if (!URL_BASE || !KEY) return null;
  try {
    const headers: Record<string, string> = { apikey: KEY, Authorization: `Bearer ${KEY}` };
    if (withCount) headers.Prefer = "count=exact";
    const res = await fetch(`${URL_BASE}/rest/v1/market_listings?${params}`, { headers, cache: "no-store" });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    const total = Number(res.headers.get("content-range")?.split("/")[1]);
    return { rows, total: Number.isFinite(total) ? total : null };
  } catch {
    return null;
  }
}

// PostgREST caps a response at 1,000 rows, so larger reads fetch the first
// page with an exact count, then the remaining pages in parallel.
const PAGE = 1000;
async function queryAll(params: string, limit: number): Promise<any[] | null> {
  const first = await queryPage(`${params}&limit=${Math.min(PAGE, limit)}&offset=0`, limit > PAGE);
  if (!first) return null;
  const want = Math.min(limit, first.total ?? first.rows.length);
  if (first.rows.length < PAGE || want <= PAGE) return first.rows;
  const offsets: number[] = [];
  for (let o = PAGE; o < want; o += PAGE) offsets.push(o);
  const rest = await Promise.all(offsets.map((o) => queryPage(`${params}&limit=${Math.min(PAGE, want - o)}&offset=${o}`)));
  return first.rows.concat(...rest.map((r) => r?.rows ?? []));
}

const BOLIG_COLS = "id,url,image,address,road,zip,city,price,area,rooms,year_built,energy_label,type,lat,lon,municipality,first_seen";

/** Only listings the market agent first saw at or after this moment (ISO), for search agents. */
const sinceFilter = (since?: string) => (since && !Number.isNaN(Date.parse(since)) ? `first_seen=gte.${encodeURIComponent(new Date(since).toISOString())}` : null);

function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── residential ──────────────────────────────────────────────────────────────
function muniFilter(municipalities?: string[]): string | null {
  const list = (municipalities ?? []).map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return null;
  if (list.length === 1) return `municipality=eq.${encodeURIComponent(list[0])}`;
  return `municipality=in.(${list.map((s) => encodeURIComponent(s)).join(",")})`;
}

export async function readBoligDeals(opts: {
  municipalities?: string[];
  zip?: string;
  type?: string;
  limit?: number;
  since?: string;
}): Promise<DealListing[] | null> {
  const q = ["market=eq.bolig", "status=neq.gone", `select=${BOLIG_COLS}`, "order=updated_at.desc,id.asc"];
  if (opts.type) q.push(`type=eq.${encodeURIComponent(opts.type)}`);
  const mf = muniFilter(opts.municipalities);
  if (mf) q.push(mf);
  if (opts.zip) q.push(`zip=eq.${encodeURIComponent(opts.zip)}`);
  const sf = sinceFilter(opts.since);
  if (sf) q.push(sf);
  const rows = await queryAll(q.join("&"), opts.limit ?? 1500);
  if (!rows) return null;
  return rows.map((r) => ({
    id: r.id,
    source: host(r.url),
    url: r.url ?? "",
    image: r.image ?? null,
    address: r.address ?? "",
    road: r.road ?? "",
    zip: num(r.zip) ?? 0,
    city: r.city ?? "",
    price: num(r.price) ?? 0,
    monthlyExpense: null,
    area: num(r.area),
    rooms: num(r.rooms),
    yearBuilt: num(r.year_built),
    energyLabel: r.energy_label ?? null,
    priceChangePct: null,
    daysOnMarket: null,
    type: r.type ?? "condo",
    bfe: null,
    lat: num(r.lat),
    lon: num(r.lon),
    municipality: r.municipality ?? null,
    firstSeen: r.first_seen ?? null,
  }));
}

// ── investment / commercial ──────────────────────────────────────────────────
/** How many investment and commercial properties are for sale right now (the agent's live count). */
export async function countInvestments(): Promise<number | null> {
  const r = await queryPage("market=eq.investering&status=neq.gone&select=id&limit=1", true);
  return r?.total ?? null;
}

export async function readInvestmentDeals(opts: {
  municipalities?: string[];
  region?: string;
  limit?: number;
  since?: string;
}): Promise<InvestmentListing[] | null> {
  const q = ["market=eq.investering", "status=neq.gone", "select=*", "order=updated_at.desc,id.asc"];
  // exact kommune(r) first; fall back to the coarse province only if none given
  const mf = muniFilter(opts.municipalities);
  if (mf) q.push(mf);
  else if (opts.region) q.push(`region=eq.${encodeURIComponent(opts.region)}`);
  const sf = sinceFilter(opts.since);
  if (sf) q.push(sf);
  const rows = await queryAll(q.join("&"), opts.limit ?? 3000);
  if (!rows) return null;
  return rows.map((r) => ({
    id: r.id,
    source: "ejendomstorvet.dk",
    url: r.url ?? "",
    image: etImage(r.image),
    title: r.road || r.address || "",
    address: r.address ?? "",
    road: r.road ?? "",
    zip: num(r.zip) ?? 0,
    city: r.city ?? "",
    subcategory: r.subcategory ?? null,
    price: num(r.price) ?? 0,
    returnPercent: num(r.return_percent),
    operatingCost: num(r.operating_cost),
    yearlyRent: null,
    area: num(r.area),
    energyLabel: r.energy_label ?? null,
    lat: num(r.lat),
    lon: num(r.lon),
    municipality: r.municipality ?? null,
    firstSeen: r.first_seen ?? null,
  }));
}
