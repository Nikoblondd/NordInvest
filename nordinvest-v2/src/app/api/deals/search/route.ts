import { NextResponse } from "next/server";
import { searchBoligsiden } from "@/lib/portals/boligsiden";
import { searchEjendomstorvet } from "@/lib/portals/ejendomstorvet";
import { readBoligDeals, readInvestmentDeals } from "@/lib/portals/marketdb";
import { zipToMunicipality } from "@/lib/kommuner";
import { analyzeDeal, isPlausible, sortDeals, analyzeInvestment, sortInvestments, type AnalyzedDeal, type InvestmentDeal, type DealSort, COMMERCIAL_DOWN_PCT } from "@/lib/deals";
import type { Strategy } from "@/lib/analysis";
import { dealAccess } from "@/lib/deal-access";
import { DEAL_ROWS, MAP_LIMIT, type DealAccess } from "@/lib/deal-tiers";
import { gateApi } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const num = (v: string | null, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
const opt = (v: string | null) => (v && Number.isFinite(Number(v)) ? Number(v) : undefined);

// City slug → Ejendomstorvet province code (investment market is filtered by
// broad province, not municipality). Unmapped cities search nationally.
const CITY_PROVINCE: Record<string, string> = {
  koebenhavn: "DK011", frederiksberg: "DK011",
  aarhus: "DK042", horsens: "DK042", randers: "DK042",
  odense: "DK031",
  aalborg: "DK050",
  roskilde: "DK021",
};

// All filters are applied HERE, in our own code, after fetching a broad pool —
// so they are always exact regardless of each portal's own (often unreliable)
// filter params. This is what makes "max 10 mio." actually mean max 10 mio.
type Filters = {
  priceMin?: number; priceMax?: number; areaMin?: number;
  roomsMin?: number; yearFrom?: number; energy?: Set<string>;
  minScore?: number; minYield?: number; minCashflow?: number;
  minDscr?: number; subcat?: string;
};

export async function GET(req: Request) {
  const denied = await gateApi(req);
  if (denied) return denied;
  const p = new URL(req.url).searchParams;
  // `municipality` may be a comma-separated list of kommune slugs (multi-select).
  const municipalities = (p.get("municipality") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const muniSet = new Set(municipalities);
  const zip = p.get("zip") || undefined;
  // `all=1` (used by the nationwide map) returns listings across the whole
  // country — no kommune required. The list view still requires an area.
  const nationwide = p.get("all") === "1";
  if (municipalities.length === 0 && !zip && !nationwide) {
    return NextResponse.json({ ok: false, error: "missing_area", deals: [] }, { status: 200 });
  }

  // The engine is the paid product: without a paid plan a search shows its top
  // rows only, the advanced filters are ignored and the map is closed.
  const access = await dealAccess(req);
  const paid = access === "paid";
  if (!paid && num(p.get("limit"), 36) > MAP_LIMIT) {
    return NextResponse.json({ ok: false, error: "locked", lock: "map", access, deals: [] }, { status: 200 });
  }

  const market = p.get("market") || "bolig";
  const strategy = (p.get("strategy") as Strategy) || "cashflow";
  const sort = (p.get("sort") as DealSort) || "score";
  const downPaymentPct = num(p.get("downPaymentPct"), market === "investering" ? COMMERCIAL_DOWN_PCT : 20);
  const interestRate = num(p.get("interestRate"), 5);
  // Default 36 for the list; the map view requests many more (with coordinates).
  const limit = Math.min(4000, num(p.get("limit"), 36));
  // Score the whole area, not just the newest rows, so "best" means best;
  // `limit` only caps how many come back.
  const pool = Math.max(limit, nationwide && municipalities.length === 0 ? 4000 : 1500);
  // Search agents ask only for listings that came on the market since their last run.
  const sinceRaw = p.get("since");
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? new Date(sinceRaw).toISOString() : undefined;
  const typeParam = p.get("type") || "condo";
  // `type=all` (used by the nationwide map) means every residential type.
  const type = typeParam === "all" ? undefined : typeParam;

  const energyParam = (p.get("energy") || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const f: Filters = {
    priceMin: opt(p.get("priceMin")),
    priceMax: opt(p.get("priceMax")),
    areaMin: opt(p.get("areaMin")),
    roomsMin: opt(p.get("roomsMin")),
    yearFrom: opt(p.get("yearFrom")),
    energy: energyParam.length ? new Set(energyParam) : undefined,
    minScore: opt(p.get("minScore")),
    minYield: opt(p.get("minYield")),
    minCashflow: opt(p.get("minCashflow")),
    minDscr: opt(p.get("minDscr")),
    subcat: p.get("subcat") || undefined,
  };
  if (!paid) {
    f.minYield = f.minCashflow = f.minScore = f.minDscr = f.roomsMin = f.yearFrom = undefined;
    f.energy = undefined;
    f.subcat = undefined;
  }

  const passCommon = (d: { price: number; area: number | null; capRate: number; cashFlow: number; score: number }) => {
    if (f.priceMin != null && d.price < f.priceMin) return false;
    if (f.priceMax != null && d.price > f.priceMax) return false;
    if (f.areaMin != null && (d.area == null || d.area < f.areaMin)) return false;
    if (f.minScore != null && d.score < f.minScore) return false;
    if (f.minYield != null && d.capRate < f.minYield) return false;
    if (f.minCashflow != null && d.cashFlow < f.minCashflow) return false;
    return true;
  };

  // ── Investment market (Ejendomstorvet) ──
  if (market === "investering") {
    // Provinces spanned by the selected kommuner (for the coarse live fallback).
    const provinces = Array.from(new Set(municipalities.map((m) => CITY_PROVINCE[m]).filter(Boolean)));
    // Prefer the agent's fresh, deduped dataset — filtered to the EXACT kommuner.
    let listings = await readInvestmentDeals({ municipalities, limit: pool, since });
    let servedFrom = "agent";
    // With `since`, an empty answer from the dataset means "nothing new": no live fallback.
    if (!listings || (listings.length === 0 && !since)) {
      // Live fallback: Ejendomstorvet's own area params are coarse, so fetch each
      // spanned province (or nationally) and pin every listing to its kommune by zip.
      const batches = provinces.length
        ? await Promise.all(provinces.map((province) => searchEjendomstorvet({ province })))
        : [await searchEjendomstorvet({})];
      const live = batches.flat();
      listings = muniSet.size ? live.filter((l) => muniSet.has(zipToMunicipality(l.zip) ?? "")) : live;
      servedFrom = "live";
    }
    const analyzed = listings
      .map((l) => analyzeInvestment(l, { downPaymentPct, interestRate, rentFactor: 1, strategy }))
      .filter((d): d is InvestmentDeal => d !== null)
      .filter((d) => passCommon(d))
      .filter((d) => (f.minDscr == null || d.dscr >= f.minDscr))
      .filter((d) => (!f.subcat || d.subcategory === f.subcat));
    const g = gate(sortInvestments(analyzed, sort), access, limit);
    return NextResponse.json({
      ok: true, market, servedFrom, count: g.deals.length, scanned: listings.length,
      assumptions: { downPaymentPct, interestRate, strategy }, access, locked: g.locked, deals: g.deals,
    });
  }

  // ── Residential market (Boligsiden) ──
  let rentFactor = 1;
  if (municipalities.length === 1) {
    try {
      const cal = await fetch(`${SITE}/api/calibration?region=${encodeURIComponent(municipalities[0])}`, { cache: "no-store" }).then((r) => r.json());
      if (cal && Number.isFinite(cal.rentFactor)) rentFactor = cal.rentFactor;
    } catch { /* fall back to 1 */ }
  }

  // Prefer the agent's fresh, deduped dataset; fall back to a live fetch.
  let listings = await readBoligDeals({ municipalities, zip, type, limit: pool, since });
  let servedFrom = "agent";
  // With `since`, an empty answer from the dataset means "nothing new": no live fallback.
    if (!listings || (listings.length === 0 && !since)) {
    // Boligsiden's `municipalities` param takes ONE slug, so fetch each selected
    // kommune and merge (deduped) — this is what makes multi-select work live too.
    const areas = municipalities.length ? municipalities : [undefined];
    const batches = await Promise.all(
      areas.map((m) => searchBoligsiden({
        addressTypes: type ?? "condo",
        municipalities: m,
        zipCodes: zip,
        priceMin: f.priceMin,
        priceMax: f.priceMax,
        areaMin: f.areaMin,
      })),
    );
    const seen = new Set<string>();
    listings = batches.flat().filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
    servedFrom = "live";
  }

  const analyzed = listings
    .map((l) => analyzeDeal(l, { downPaymentPct, interestRate, rentFactor, strategy }))
    .filter((d): d is AnalyzedDeal => d !== null)
    .filter((d) => passCommon(d))
    .filter((d) => (f.roomsMin == null || (d.rooms != null && d.rooms >= f.roomsMin)))
    .filter((d) => (f.yearFrom == null || (d.yearBuilt != null && d.yearBuilt >= f.yearFrom)))
    .filter((d) => (!f.energy || (d.energyLabel != null && f.energy.has(d.energyLabel))));

  // Implausible listings (wrong area or price in the ad) are kept so nobody
  // loses a listing, but flagged and sorted after every plausible one.
  const flagged = analyzed.map((d) => (isPlausible(d) ? d : { ...d, suspect: true }));
  const ranked = [...sortDeals(flagged.filter((d) => !d.suspect), sort), ...sortDeals(flagged.filter((d) => d.suspect), sort)];
  const g = gate(ranked, access, limit);

  return NextResponse.json({
    ok: true, market: "bolig", servedFrom, count: g.deals.length, scanned: listings.length, rentFactor,
    assumptions: { downPaymentPct, interestRate, strategy }, access, locked: g.locked, deals: g.deals,
  });
}

// Only the visible rows leave the server; the rest are summed up so the UI can
// say what is behind the lock without giving the deals away.
function gate<T extends { cashFlow: number }>(ranked: T[], access: DealAccess, limit: number) {
  const cap = Math.min(limit, DEAL_ROWS[access]);
  const hidden = access === "paid" ? [] : ranked.slice(cap);
  return {
    deals: ranked.slice(0, cap),
    locked: hidden.length
      ? { count: hidden.length, positive: hidden.filter((d) => d.cashFlow > 0).length, bestCashflow: Math.max(...hidden.map((d) => d.cashFlow)) }
      : null,
  };
}
