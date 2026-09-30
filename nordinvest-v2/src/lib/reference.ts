// Reads the published, documented benchmark catalog the independent Datamotor
// builds from our own live market (agent/reference.mjs → public/reference.json).
// Lets the analyzer show a SOURCED "markedspris pr. m²" instead of nothing, and
// powers the public /data transparency page. Bundled at build; refreshed by
// regenerating reference.json and redeploying.

import raw from "../../public/reference.json";

export type Cell = { value: number; n: number };
export type CommercialCell = { priceM2: number; opexM2: number | null; returnPct: number | null; n: number };

export type ReferenceData = {
  asOf: string;
  generatedAt: string;
  source: string;
  totals: { bolig: number; erhverv: number; udlejning?: number };
  residential: {
    byRegionType: Record<string, Cell>;
    byRegion: Record<string, Cell>;
    byType: Record<string, Cell>;
    national: Cell | null;
  };
  commercial: {
    byRegion: Record<string, CommercialCell>;
    national: CommercialCell | null;
  };
  /** Commercial rentals — kr/m²/år. Populated when the udlejning-scraper has
      run at least once; empty on older reference.json builds. */
  commercialRent?: {
    byRegion: Record<string, Cell>;
    national: Cell | null;
  };
  regionByZip: Record<string, string>;
};

export const reference = raw as ReferenceData;

// Landsdel slugs (residential) + NUTS3 codes (commercial) → Danish labels.
export const REGION_LABEL: Record<string, string> = {
  "byen-koebenhavn": "Byen København",
  "koebenhavns-omegn": "Københavns omegn",
  nordsjaelland: "Nordsjælland",
  bornholm: "Bornholm",
  oestsjaelland: "Østsjælland",
  "vest--og-sydsjaelland": "Vest- og Sydsjælland",
  fyn: "Fyn",
  sydjylland: "Sydjylland",
  oestjylland: "Østjylland",
  vestjylland: "Vestjylland",
  nordjylland: "Nordjylland",
  DK011: "Byen København",
  DK012: "Københavns omegn",
  DK013: "Nordsjælland",
  DK014: "Bornholm",
  DK021: "Østsjælland",
  DK022: "Vest- og Sydsjælland",
  DK031: "Fyn",
  DK032: "Sydjylland",
  DK041: "Vestjylland",
  DK042: "Østjylland",
  DK050: "Nordjylland",
};

export const TYPE_LABEL: Record<string, string> = {
  condo: "Ejerlejlighed",
  cooperative: "Andelsbolig",
  "villa apartment": "Villalejlighed",
  "terraced house": "Rækkehus",
  villa: "Villa",
  "holiday house": "Sommerhus",
  farm: "Landejendom",
};

export function regionLabelOf(slug: string): string {
  return REGION_LABEL[slug] ?? slug;
}

export function regionForZip(zip: number | null | undefined): string | null {
  if (zip == null) return null;
  return reference.regionByZip[String(zip)] ?? null;
}

// Map an app/BBR property type onto a market benchmark type.
export function marketTypeFor(hint?: string | null): string {
  const t = (hint || "").toLowerCase();
  if (/andel|cooperative/.test(t)) return "cooperative";
  if (/række|terraced/.test(t)) return "terraced house";
  if (/villalejlighed|villa apartment/.test(t)) return "villa apartment";
  if (/villa|hus|enfamilie|house/.test(t)) return "villa";
  if (/sommer|holiday|fritid/.test(t)) return "holiday house";
  if (/landejendom|farm|gård/.test(t)) return "farm";
  return "condo"; // default: the most common rental-investment type
}

export type PriceBenchmark = {
  value: number; // kr/m²
  n: number;
  region: string;
  regionLabel: string;
  type: string;
  typeLabel: string;
  scope: "region-type" | "region" | "national";
  asOf: string;
  source: string;
};

/** Documented median sale price pr. m² for a zip + type, with graceful fallback. */
export function residentialPriceBenchmark(
  zip: number | null | undefined,
  typeHint?: string | null,
): PriceBenchmark | null {
  const region = regionForZip(zip);
  const type = marketTypeFor(typeHint);
  const asOf = reference.asOf;
  const source = `${reference.source} · ${reference.totals.bolig.toLocaleString("da-DK")} boligannoncer`;

  if (region) {
    const rt = reference.residential.byRegionType[`${region}|${type}`];
    if (rt) {
      return { value: rt.value, n: rt.n, region, regionLabel: regionLabelOf(region), type, typeLabel: TYPE_LABEL[type] ?? type, scope: "region-type", asOf, source };
    }
    const r = reference.residential.byRegion[region];
    if (r) {
      return { value: r.value, n: r.n, region, regionLabel: regionLabelOf(region), type, typeLabel: TYPE_LABEL[type] ?? type, scope: "region", asOf, source };
    }
  }
  const nat = reference.residential.national;
  if (nat) {
    return { value: nat.value, n: nat.n, region: "national", regionLabel: "Hele landet", type, typeLabel: TYPE_LABEL[type] ?? type, scope: "national", asOf, source };
  }
  return null;
}
