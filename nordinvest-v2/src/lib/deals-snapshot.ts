import { unstable_cache } from "next/cache";
import { readBoligDeals, readInvestmentDeals } from "@/lib/portals/marketdb";
import { searchBoligsiden } from "@/lib/portals/boligsiden";
import { searchEjendomstorvet } from "@/lib/portals/ejendomstorvet";
import { analyzeDeal, analyzeInvestment, sortDeals, sortInvestments, type AnalyzedDeal, type InvestmentDeal } from "@/lib/deals";
import { dealHref, investHref } from "@/lib/deal-links";
import { zipToMunicipality } from "@/lib/kommuner";

/*
 * Server-rendered snapshots of the Deal-motor: the best-ranked deals and a few
 * market figures, nationally or for one kommune. They put the engine's results
 * in the HTML itself, so search engines and AI assistants can read what the
 * client-side Deal-motor shows. Recomputed at most every 6 hours.
 */

// Same defaults as /api/deals/search, so the numbers match the Deal-motor.
const BOLIG = { downPaymentPct: 20, interestRate: 5, rentFactor: 1, strategy: "cashflow" as const };
const INVEST = { downPaymentPct: 30, interestRate: 5, rentFactor: 1, strategy: "cashflow" as const };

export type SnapshotDeal = {
  address: string;
  zip: number;
  city: string;
  type: string;
  price: number;
  area: number | null;
  rooms: number | null;
  score: number;
  cashFlow: number;
  capRate: number;
  grossYield: number;
  image: string | null;
  href: string;
  source: string;
};

export type SnapshotInvestment = {
  title: string;
  address: string;
  zip: number;
  city: string;
  subcategory: string | null;
  price: number;
  area: number | null;
  score: number;
  cashFlow: number;
  capRate: number;
  dscr: number;
  image: string | null;
  href: string;
};

export type DealSnapshot = {
  updated: string;
  scanned: number;
  positive: number;
  medianPricePerM2: number | null;
  medianGrossYield: number | null;
  top: SnapshotDeal[];
  investments: SnapshotInvestment[];
  investmentsScanned: number;
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const toDeal = (d: AnalyzedDeal): SnapshotDeal => ({
  address: d.address,
  zip: d.zip,
  city: d.city,
  type: d.type,
  price: d.price,
  area: d.area,
  rooms: d.rooms,
  score: d.score,
  cashFlow: d.cashFlow,
  capRate: d.capRate,
  grossYield: d.grossYield,
  image: d.image,
  href: dealHref(d, String(BOLIG.downPaymentPct), String(BOLIG.interestRate)),
  source: d.source,
});

const toInvestment = (d: InvestmentDeal): SnapshotInvestment => ({
  title: d.title,
  address: d.road || d.address,
  zip: d.zip,
  city: d.city,
  subcategory: d.subcategory,
  price: d.price,
  area: d.area,
  score: d.score,
  cashFlow: d.cashFlow,
  capRate: d.capRate,
  dscr: d.dscr,
  image: d.image,
  href: investHref(d, String(INVEST.downPaymentPct), String(INVEST.interestRate)),
});

// Year-round homes only. Holiday houses and farms dominate the freshest rows,
// but a holiday house can't be let all year, so ranking them as "best
// investments" would mislead.
const HOME_TYPES = ["condo", "villa", "terraced house"];

async function readHomes(municipality: string | null) {
  const munis = municipality ? [municipality] : [];
  const batches = await Promise.all(HOME_TYPES.map((type) => readBoligDeals({ municipalities: munis, type, limit: 1500 })));
  const rows = batches.flatMap((b) => b ?? []);
  if (rows.length) return rows;
  // Local development without the market table: one live page set of condos.
  return searchBoligsiden({ addressTypes: "condo", municipalities: municipality ?? undefined }).catch(() => []);
}

async function build(municipality: string | null, topN: number): Promise<DealSnapshot | null> {
  try {
    const homes = await readHomes(municipality);
    let invest = await readInvestmentDeals({ municipalities: municipality ? [municipality] : [], limit: 1500 });
    if (!invest || invest.length === 0) {
      const live = await searchEjendomstorvet({}).catch(() => []);
      invest = municipality ? live.filter((l) => zipToMunicipality(l.zip) === municipality) : live;
    }

    const analyzed = homes.map((l) => analyzeDeal(l, BOLIG)).filter((d): d is AnalyzedDeal => d !== null);
    if (analyzed.length === 0) return null;
    // Nationally there are always enough homes with a monthly surplus to fill
    // the list; in a single kommune there may be none, so rank by score and let
    // the page say how many are positive.
    const pool = municipality ? analyzed : analyzed.filter((d) => d.cashFlow > 0);
    const ranked = sortDeals(pool, "score");
    const investments = sortInvestments(
      invest.map((l) => analyzeInvestment(l, INVEST)).filter((d): d is InvestmentDeal => d !== null),
      "score",
    );

    return {
      updated: new Date().toISOString(),
      scanned: analyzed.length,
      positive: analyzed.filter((d) => d.cashFlow > 0).length,
      medianPricePerM2: median(analyzed.filter((d) => d.area).map((d) => d.price / (d.area as number))),
      medianGrossYield: median(analyzed.map((d) => d.grossYield)),
      top: ranked.slice(0, topN).map(toDeal),
      investments: investments.slice(0, municipality ? 3 : 5).map(toInvestment),
      investmentsScanned: invest.length,
    };
  } catch (e) {
    console.error("deal snapshot failed", municipality, e);
    return null;
  }
}

export const getDealSnapshot = unstable_cache(build, ["deal-snapshot-v2"], { revalidate: 21600 });
