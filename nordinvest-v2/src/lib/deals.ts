// Fase 5 — the deal engine. Normalised whole-market listing + the per-listing
// analysis that turns a raw ad into a ranked investment candidate.
//
// Precision principles:
//  - We only ever ANALYSE a listing that has both a price and an area; anything
//    missing those is dropped, never guessed into the ranking.
//  - Rent is the one number the market ad doesn't give us, so it's estimated
//    from a per-m² city benchmark × the brain's regional rentFactor, and every
//    surfaced deal is clearly marked as an ESTIMATE. The real, BBR- and
//    photo-grounded analysis happens when the user clicks through.

import { analyze, type Strategy } from "@/lib/analysis";
import type { InvestmentListing } from "@/lib/portals/ejendomstorvet";

export type DealListing = {
  id: string;
  source: string; // agent host, e.g. "edc.dk"
  url: string; // deep link to the agent's listing
  image: string | null;
  address: string;
  road: string;
  zip: number;
  city: string;
  price: number;
  monthlyExpense: number | null;
  area: number | null;
  rooms: number | null;
  yearBuilt: number | null;
  energyLabel: string | null;
  priceChangePct: number | null;
  daysOnMarket: number | null;
  type: string;
  bfe: number | null;
  lat: number | null;
  lon: number | null;
};

export type AnalyzedDeal = DealListing & {
  estRent: number;
  score: number;
  cashFlow: number; // kr/md
  capRate: number; // %
  grossYield: number; // %
  cashOnCash: number; // %
};

// Private-market rent benchmark, kr/m²/month (2026, conservative). This is the
// single biggest driver of the cash-flow estimate, so it's tiered by area
// rather than a flat national number. Refined per-region by the brain's factor.
function rentPerM2(zip: number): number {
  if (zip >= 1000 && zip <= 1499) return 175; // København K (indre by)
  if (zip >= 1500 && zip <= 1799) return 170; // København V
  if (zip >= 1800 && zip <= 2000) return 165; // Frederiksberg
  if (zip === 2100 || zip === 2150) return 175; // Østerbro
  if (zip === 2200) return 170; // Nørrebro
  if (zip === 2300) return 165; // Amager / København S
  if (zip === 2400 || zip === 2450 || zip === 2500) return 160; // NV / SV / Valby
  if (zip >= 2600 && zip <= 2990) return 135; // København omegn
  if (zip === 8000) return 130; // Aarhus C
  if (zip >= 8200 && zip <= 8270) return 108; // Aarhus omegn
  if (zip >= 5000 && zip <= 5270) return 100; // Odense
  if (zip >= 9000 && zip <= 9220) return 95; // Aalborg
  if (zip === 6700 || zip === 6705 || zip === 6710) return 90; // Esbjerg
  if (zip === 6000 || zip === 7000 || zip === 7100) return 95; // Trekantsområdet
  if (zip >= 3000 && zip <= 3670) return 110; // Nordsjælland
  if (zip >= 4000 && zip <= 4400) return 95; // Roskilde/Sjælland
  return 88; // resten af landet — bevidst konservativt
}

// Round a rent to the nearest 100 kr, keep it sane.
const round100 = (n: number) => Math.max(0, Math.round(n / 100) * 100);

export type DealAssumptions = {
  downPaymentPct: number;
  interestRate: number;
  rentFactor: number; // from the brain (regional), default 1
  strategy: Strategy;
};

export function analyzeDeal(l: DealListing, a: DealAssumptions): AnalyzedDeal | null {
  if (!l.price || !l.area || l.area < 10) return null;
  const estRent = round100(l.area * rentPerM2(l.zip) * (a.rentFactor || 1));
  const monthlyOpex = l.monthlyExpense ?? Math.round((l.area * 35) / 50) * 50;
  const r = analyze({
    price: l.price,
    monthlyRent: estRent,
    downPaymentPct: a.downPaymentPct,
    interestRate: a.interestRate,
    monthlyOpex,
    strategy: a.strategy,
  });
  return {
    ...l,
    estRent,
    score: r.score,
    cashFlow: r.cashFlow,
    capRate: r.capRate,
    grossYield: r.grossYield,
    cashOnCash: r.cashOnCash,
  };
}

// ── Investment properties (Ejendomstorvet) ──────────────────
// These publish a real starting yield, so we reconstruct the actual NOI and run
// the same engine — no rent estimate needed. Far more precise than a home guess.
export type InvestmentDeal = InvestmentListing & {
  noi: number; // yearly net operating income (kr)
  score: number;
  cashFlow: number; // kr/md
  capRate: number; // %
  cashOnCash: number; // %
  dscr: number;
  note: string | null; // short, knowledge-based caveat (e.g. high-yield risk)
};

// Realistic Danish starting yields (afkast) per asset class, 2026. The point is
// NOT "higher yield = better": a yield inside its class band is healthy, while a
// yield well ABOVE the band almost always prices in real risk (vacancy, a single
// tenant, secondary location, obsolescence) — so it must not be rewarded like
// quality. Below the band means the property is priced expensively.
const CLASS_YIELD: Record<string, { low: number; goodLo: number; goodHi: number; high: number }> = {
  "Boligudlejning":        { low: 3.0, goodLo: 4.0, goodHi: 5.5, high: 6.5 },
  "Kontor":                { low: 4.0, goodLo: 5.0, goodHi: 6.5, high: 8.0 },
  "Detailhandel & butik":  { low: 4.5, goodLo: 5.5, goodHi: 7.0, high: 8.5 },
  "Lager & produktion":    { low: 5.5, goodLo: 6.5, goodHi: 8.0, high: 9.5 },
  "Hotel & restaurant":    { low: 5.0, goodLo: 6.0, goodHi: 8.0, high: 9.5 },
  "Grunde":                { low: 3.0, goodLo: 4.0, goodHi: 6.0, high: 8.0 },
  "Andre typer":           { low: 4.5, goodLo: 5.5, goodHi: 7.5, high: 9.0 },
};
const DEFAULT_YIELD = { low: 4.5, goodLo: 5.5, goodHi: 7.0, high: 9.0 };

// A knowledge-based, asset-class-aware score for a commercial/investment deal.
// Built from the property's OWN yield, financing safety (DSCR) and levered
// return — not a generic residential formula — and deliberately conservative so
// a top score is rare and a suspiciously high yield reads as risk, not quality.
function scoreInvestment(capRate: number, dscr: number, cashOnCash: number, subcategory: string | null): number {
  const b = (subcategory && CLASS_YIELD[subcategory]) || DEFAULT_YIELD;
  let score = 45;

  // 1) Yield quality relative to the asset class.
  if (capRate >= b.goodLo && capRate <= b.goodHi) score += 16;      // healthy for the type
  else if (capRate > b.goodHi && capRate <= b.high) score += 7;     // high — risk premium
  else if (capRate > b.high) score += 1;                            // abnormally high → risk
  else if (capRate >= b.low && capRate < b.goodLo) score += 8;      // toward prime (safe, pricier)
  else score -= 8;                                                  // below prime → expensive

  // 2) Financing safety — the real make-or-break for a leveraged deal.
  if (dscr >= 1.6) score += 18;
  else if (dscr >= 1.35) score += 12;
  else if (dscr >= 1.2) score += 7;
  else if (dscr >= 1.0) score += 1;
  else score -= 22;

  // 3) Levered cash-on-cash return (year 1).
  if (cashOnCash >= 10) score += 13;
  else if (cashOnCash >= 6) score += 9;
  else if (cashOnCash >= 3) score += 5;
  else if (cashOnCash >= 0) score += 1;
  else score -= 12;

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Reserve the very top band: a 90+ requires everything to genuinely align
  // (solid in-band yield, strong debt cover, real cash return). Otherwise cap it,
  // so a high-yield/high-risk industrial deal can't masquerade as a 100.
  const excellent = capRate >= b.goodLo && capRate <= b.high && dscr >= 1.6 && cashOnCash >= 8;
  if (score > 90 && !excellent) score = 90;

  return score;
}

// The single source of truth for how a commercial/investment deal is judged —
// used by BOTH the deal engine and the full analyzer, so a property's score,
// caveat and rating are identical everywhere.
export function assessInvestment(
  capRate: number, dscr: number, cashOnCash: number, subcategory: string | null,
): { score: number; note: string | null; rating: string; verdict: string } {
  const b = (subcategory && CLASS_YIELD[subcategory]) || DEFAULT_YIELD;
  const score = scoreInvestment(capRate, dscr, cashOnCash, subcategory);

  let note: string | null = null;
  if (capRate > b.high) note = "Usædvanligt højt afkast for typen — ofte tegn på tomgangs-, lejer- eller beliggenhedsrisiko. Verificér lejekontrakter og stand.";
  else if (capRate > b.goodHi) note = "Højt afkast for typen — tjek risiko, beliggenhed og lejers bonitet.";
  else if (capRate < b.low) note = "Lavt afkast for typen — prissat i den dyre ende.";
  else if (dscr < 1.1) note = "Gælden er kun lige dækket ved denne udbetaling og rente.";

  const rating = score >= 78 ? "Stærk" : score >= 62 ? "Solid" : score >= 45 ? "Middel" : "Svag";
  const verdict =
    dscr < 1.0
      ? "Gælden er ikke dækket ved denne udbetaling og rente — forhandl pris eller læg mere ud."
      : score >= 62
      ? `Solid investeringsejendom. Afkastet passer til typen og gælden er dækket (DSCR ${dscr.toFixed(2)}).`
      : score >= 45
      ? "Grænsehandel. Tallene hænger, men marginen er tynd — verificér lejekontrakter og drift."
      : "Svag som investering ved disse tal — genforhandl eller spring over.";
  return { score, note, rating, verdict };
}

export function analyzeInvestment(l: InvestmentListing, a: DealAssumptions): InvestmentDeal | null {
  if (!l.price || l.price <= 0) return null;
  // NOI from the stated yield first (the investor's headline number) — but only
  // when it's a sane figure; fall back to rent minus operating cost otherwise.
  let noi: number | null = null;
  const ret = l.returnPercent;
  if (ret != null && ret >= 1 && ret <= 20) noi = (l.price * ret) / 100;
  else if (l.yearlyRent && l.yearlyRent > 0) noi = l.yearlyRent - (l.operatingCost ?? 0);
  if (noi == null || noi <= 0) return null;

  // Reconstruct an input where analyze() reproduces exactly this NOI: gross rent
  // = NOI, no extra vacancy/maintenance/opex (NOI is already net).
  const r = analyze({
    price: l.price,
    monthlyRent: noi / 12,
    downPaymentPct: a.downPaymentPct,
    interestRate: a.interestRate,
    monthlyOpex: 0,
    vacancyPct: 0,
    maintenancePct: 0,
    strategy: a.strategy,
  });
  const assessed = assessInvestment(r.capRate, r.dscr, r.cashOnCash, l.subcategory);

  return {
    ...l,
    noi: Math.round(noi),
    score: assessed.score,
    cashFlow: r.cashFlow,
    capRate: r.capRate,
    cashOnCash: r.cashOnCash,
    dscr: r.dscr,
    note: assessed.note,
  };
}

export type DealSort =
  | "score"
  | "priceAsc" | "priceDesc"
  | "cashflowDesc" | "cashflowAsc"
  | "yieldDesc" | "yieldAsc"
  | "areaDesc" | "areaAsc"
  // legacy aliases (older saved searches) — map to the new directional keys
  | "cashflow" | "yield" | "price";

// One comparator used by BOTH markets. Every field the two deal types share.
type Sortable = { price: number; cashFlow: number; capRate: number; score: number; area: number | null };

function areaCmp(a: number | null, b: number | null, asc: boolean): number {
  const av = Number.isFinite(a as number) ? (a as number) : null;
  const bv = Number.isFinite(b as number) ? (b as number) : null;
  if (av == null && bv == null) return 0;
  if (av == null) return 1; // unknown area always sorts last
  if (bv == null) return -1;
  return asc ? av - bv : bv - av;
}

function comparator(by: DealSort): (x: Sortable, y: Sortable) => number {
  switch (by) {
    case "priceAsc": case "price": return (x, y) => x.price - y.price;
    case "priceDesc": return (x, y) => y.price - x.price;
    case "cashflowAsc": return (x, y) => x.cashFlow - y.cashFlow;
    case "cashflowDesc": case "cashflow": return (x, y) => y.cashFlow - x.cashFlow;
    case "yieldAsc": return (x, y) => x.capRate - y.capRate;
    case "yieldDesc": case "yield": return (x, y) => y.capRate - x.capRate;
    case "areaAsc": return (x, y) => areaCmp(x.area, y.area, true);
    case "areaDesc": return (x, y) => areaCmp(x.area, y.area, false);
    default: return (x, y) => y.score - x.score; // "score" — best first
  }
}

export function sortInvestments(deals: InvestmentDeal[], by: DealSort): InvestmentDeal[] {
  return [...deals].sort(comparator(by));
}

export function sortDeals(deals: AnalyzedDeal[], by: DealSort): AnalyzedDeal[] {
  return [...deals].sort(comparator(by));
}
