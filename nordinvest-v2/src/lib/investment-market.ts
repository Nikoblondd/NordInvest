import { unstable_cache } from "next/cache";
import { readInvestmentDeals } from "@/lib/portals/marketdb";
import { searchEjendomstorvet } from "@/lib/portals/ejendomstorvet";
import { analyzeInvestment, sortInvestments, CLASS_YIELD, DEFAULT_YIELD, type InvestmentDeal } from "@/lib/deals";
import { MUNICIPALITIES, zipToMunicipality } from "@/lib/kommuner";
import { listingImage } from "@/lib/image-url";

/*
 * The investment market in numbers, for the public page on udlejnings- og
 * erhvervsejendomme til salg: every listing from Ejendomstorvet regnet med
 * 30 % udbetaling og 5 % rente, the stated startafkast per property type
 * against the normal band, where they are, and the best by score.
 * Rebuilt every 6 hours like the Deal-motor.
 */

const INVEST = { downPaymentPct: 30, interestRate: 5, rentFactor: 1, strategy: "cashflow" as const };
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export type MarketRow = { title: string; road: string; zip: number; city: string; kommune: string | null; subcategory: string | null; price: number; area: number | null; capRate: number; cashFlow: number; dscr: number; score: number; image: string | null; url: string };
export type InvestmentMarket = {
  updated: string;
  total: number;
  types: { name: string; count: number; medianYield: number | null; medianPrice: number | null; band: { goodLo: number; goodHi: number } }[];
  kommuner: { slug: string; name: string; count: number; medianYield: number | null }[];
  top: MarketRow[];
  rental: MarketRow[];
};

async function build(): Promise<InvestmentMarket | null> {
  try {
    let listings = await readInvestmentDeals({ municipalities: [], limit: 6000 });
    if (!listings || !listings.length) listings = await searchEjendomstorvet({}).catch(() => []);
    const deals = listings.map((l) => analyzeInvestment(l, INVEST)).filter((d): d is InvestmentDeal => d !== null && d.price > 0);
    if (!deals.length) return null;
    const row = (d: InvestmentDeal): MarketRow => {
      const slug = zipToMunicipality(d.zip);
      return { title: d.title, road: d.road || d.address, zip: d.zip, city: d.city, kommune: slug ? MUNICIPALITIES.find((m) => m.slug === slug)?.name ?? null : null, subcategory: d.subcategory, price: d.price, area: d.area, capRate: d.capRate, cashFlow: d.cashFlow, dscr: d.dscr, score: d.score, image: listingImage(d.image), url: d.url };
    };
    const byType = new Map<string, InvestmentDeal[]>();
    for (const d of deals) { const k = d.subcategory ?? "Andre typer"; byType.set(k, [...(byType.get(k) ?? []), d]); }
    const byKommune = new Map<string, InvestmentDeal[]>();
    for (const d of deals) { const k = zipToMunicipality(d.zip); if (k) byKommune.set(k, [...(byKommune.get(k) ?? []), d]); }
    const ranked = sortInvestments(deals, "score");
    return {
      updated: new Date().toISOString(),
      total: deals.length,
      types: Array.from(byType.entries()).map(([name, list]) => {
        const b = CLASS_YIELD[name] ?? DEFAULT_YIELD;
        return { name, count: list.length, medianYield: median(list.map((d) => d.capRate).filter((x) => x > 0 && x < 25)), medianPrice: median(list.map((d) => d.price)), band: { goodLo: b.goodLo, goodHi: b.goodHi } };
      }).sort((a, b) => b.count - a.count),
      kommuner: Array.from(byKommune.entries()).map(([slug, list]) => ({ slug, name: MUNICIPALITIES.find((m) => m.slug === slug)?.name ?? slug, count: list.length, medianYield: median(list.map((d) => d.capRate).filter((x) => x > 0 && x < 25)) })).sort((a, b) => b.count - a.count).slice(0, 15),
      top: ranked.slice(0, 12).map(row),
      rental: ranked.filter((d) => d.subcategory === "Boligudlejning").slice(0, 12).map(row),
    };
  } catch (e) {
    console.error("investment market failed", e);
    return null;
  }
}

export const getInvestmentMarket = unstable_cache(build, ["investment-market-v1"], { revalidate: 21600 });
