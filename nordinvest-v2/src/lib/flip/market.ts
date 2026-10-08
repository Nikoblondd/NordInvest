/*
 * Flip market: what homes like this one sell for before and after a
 * renovation, from the live Boligsiden listings in the same postnummer.
 *
 * Every comparable is sorted by what its own listing text says. "Nyrenoveret",
 * "nyt køkken" or "gennemrenoveret" put it in RENOVATED; "håndværkertilbud",
 * "trænger til" or "dødsbo" put it in NEEDS WORK. New builds (from 2005) are
 * kept out of the renovated group for older homes, so a 1930s house is never
 * valued against a new one. The renovated median price per m² is our
 * after-renovation value (ARV); the user sees every comparable behind it.
 */

const BS = "https://api.boligsiden.dk/search/cases";

// Boligsiden's own addressType names; "terraced" alone makes the API fail.
const TYPE: Record<string, string> = { villa: "villa", condo: "condo", terraced: "terraced house", "terraced house": "terraced house" };

const STRONG = /nyrenover|totalrenover|gennemrenover|renoveret i (?:19|20)\d\d|nyt køkken|nyere køkken|nyt bad|nye? badeværelse|nyistandsat|istandsat i (?:19|20)\d\d/gi;
const WEAK = /indflytningsklar|moderniseret|istandsat|renoveret/gi;
const NEEDS = /håndværkertilbud|trænger til|renoveringsbehov|kærlig hånd|renoveringsprojekt|projektbolig|dødsbo|sætte (?:sit|jeres|dit) eget præg|moderniser(?!et|ing af)|renoveringsegnet|behov for renovering/gi;

export type Condition = "renovated" | "standard" | "needs_work";

export type FlipComp = {
  address: string;
  city: string;
  price: number;
  area: number;
  perM2: number;
  yearBuilt: number | null;
  energy: string | null;
  days: number | null;
  cut: number; // price change since listing, % (negative = cut)
  condition: Condition;
  evidence: string | null; // the phrase in the listing that decided it
  url: string;
  image: string | null;
};

export type FlipMarket = {
  ok: true;
  zip: string;
  type: string;
  sample: number;
  medianRenovated: number | null;
  medianStandard: number | null;
  medianNeedsWork: number | null;
  q1Renovated: number | null;
  q3Renovated: number | null;
  spread: number | null; // renovated minus needs-work, kr. per m²
  medianDays: number | null;
  // How far asking prices actually fall here: the share of listings that have
  // been cut, and the median cut among them (%, positive number).
  shareCut: number;
  medianCut: number | null;
  // Tinglyste handler in the postnummer (Ejerfortegnelsen), when available.
  sold?: { n: number; medianM2: number; medianDiscount: number | null; asOf: string } | null;
  comps: FlipComp[];
} | { ok: false; reason: string };

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quant = (xs: number[], q: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((s.length - 1) * q))];
};

export function classify(text: string, yearBuilt: number | null, subjectYear: number | null): { condition: Condition; evidence: string | null } {
  const strong = text.match(STRONG) ?? [];
  const weak = text.match(WEAK) ?? [];
  const needs = text.match(NEEDS) ?? [];
  const isNew = yearBuilt != null && yearBuilt >= 2005 && (subjectYear == null || subjectYear < 2000);
  if (needs.length && !strong.length) return { condition: "needs_work", evidence: needs[0] ?? null };
  if (strong.length && !isNew) return { condition: "renovated", evidence: strong[0] ?? null };
  if (weak.length && !needs.length && !isNew) return { condition: "renovated", evidence: weak[0] ?? null };
  return { condition: "standard", evidence: null };
}

export async function getFlipMarket(zip: string, type: string, area: number, subjectYear: number | null): Promise<FlipMarket> {
  if (!/^\d{4}$/.test(zip) || !(area > 15)) return { ok: false, reason: "bad_input" };
  const bsType = TYPE[type] ?? "villa";
  const lo = Math.floor(area * 0.65);
  const hi = Math.ceil(area * 1.4);
  const load = async (types: string) => {
    const res = await fetch(`${BS}?zipCodes=${zip}&addressTypes=${encodeURIComponent(types)}&housingArea=${lo}-${hi}&per_page=100`, {
      headers: { "user-agent": "nordinvest/1.0 (+https://nordinvest.io)" },
      next: { revalidate: 21_600 },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`boligsiden ${res.status}`);
    const j = (await res.json()) as { cases?: Record<string, unknown>[] };
    return Array.isArray(j.cases) ? j.cases : [];
  };
  let cases: Record<string, unknown>[] = [];
  try {
    cases = await load(bsType);
    // Few rækkehuse for sale in a postnummer is normal; villas of the same
    // size are the nearest market, so they join the comparison.
    if (cases.length < 12 && bsType === "terraced house") cases = await load("terraced house,villa");
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }

  const comps: FlipComp[] = [];
  for (const c of cases) {
    const price = Number(c.priceCash);
    const a = Number(c.housingArea);
    if (!(price > 0) || !(a > 15)) continue;
    const addr = (c.address ?? {}) as Record<string, unknown>;
    const yb = Number(c.yearBuilt);
    const yearBuilt = Number.isFinite(yb) && yb > 1500 ? yb : null;
    const text = `${c.descriptionTitle ?? ""} ${c.descriptionBody ?? ""}`;
    const { condition, evidence } = classify(text, yearBuilt, subjectYear);
    const img = (c.defaultImage ?? {}) as Record<string, unknown>;
    const srcs = Array.isArray(img.imageSources) ? (img.imageSources as { url?: string; size?: { width?: number } }[]) : [];
    const imgSrc = (srcs.find((x) => (x.size?.width ?? 0) >= 400) ?? srcs[srcs.length - 1])?.url ?? null;
    comps.push({
      address: `${addr.roadName ?? ""} ${addr.houseNumber ?? ""}`.trim(),
      city: String(addr.cityName ?? ""),
      price,
      area: a,
      perM2: Math.round(price / a),
      yearBuilt,
      energy: typeof c.energyLabel === "string" ? c.energyLabel.toUpperCase().replace(/^A(20)?(15|10|20)$/, "A") : null,
      days: Number.isFinite(Number(c.daysOnMarket)) ? Number(c.daysOnMarket) : null,
      cut: Number.isFinite(Number(c.priceChangePercentage)) ? Number(c.priceChangePercentage) : 0,
      condition,
      evidence,
      url: typeof c.slugAddress === "string" ? `https://www.boligsiden.dk/adresse/${c.slugAddress}` : `https://www.boligsiden.dk/postnummer/${zip}`,
      image: imgSrc,
    });
  }
  if (comps.length === 0) return { ok: false, reason: "no_matches" };

  const by = (k: Condition) => comps.filter((c) => c.condition === k).map((c) => c.perM2);
  const ren = by("renovated");
  const nw = by("needs_work");
  const medR = ren.length >= 3 ? median(ren) : null;
  const medN = nw.length >= 2 ? median(nw) : null;
  return {
    ok: true,
    zip,
    type: bsType,
    sample: comps.length,
    medianRenovated: medR,
    medianStandard: median(by("standard")),
    medianNeedsWork: medN,
    q1Renovated: ren.length >= 3 ? quant(ren, 0.25) : null,
    q3Renovated: ren.length >= 3 ? quant(ren, 0.75) : null,
    spread: medR != null && medN != null ? Math.round(medR - medN) : null,
    medianDays: median(comps.map((c) => c.days).filter((d): d is number => d != null)),
    shareCut: comps.filter((c) => c.cut < -0.5).length / comps.length,
    medianCut: (() => { const cuts = comps.filter((c) => c.cut < -0.5).map((c) => -c.cut); return cuts.length >= 3 ? Math.round((median(cuts) ?? 0) * 10) / 10 : null; })(),
    comps: comps.sort((a, b) => b.perM2 - a.perM2),
  };
}
