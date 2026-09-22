/**
 * Comparables — pull similar active Boligsiden listings for the given
 * property and benchmark the asking price against the local sample.
 *
 * P3 from the r/investering Reddit thread: buyers repeatedly said the
 * salgsopstilling never tells them what similar properties are actually
 * listed for right now — they end up manually eyeballing 3-4 boligsiden
 * tabs. We do it once, honestly, and surface the median + IQR alongside
 * the asking price so the user knows if they're paying a premium.
 */
const BS_BASE = "https://api.boligsiden.dk/search/cases";

/** Map our internal subcat labels to Boligsiden addressTypes. */
const TYPE_MAP: Record<string, string> = {
  condo: "condo",
  villa: "villa",
  terraced: "terraced",
  cooperative: "cooperative",
  holiday: "holidayHouse",
  farm: "farm",
  houseWithFlat: "houseWithFlat",
  villa_apartment: "villaApartment",
};

export type Comparable = {
  address: string;
  city: string;
  zipCode: string;
  price: number;
  area: number;
  pricePerM2: number;
  rooms?: number;
  yearBuilt?: number;
  daysOnMarket?: number;
  url: string;
};

export type ComparablesResult = {
  ok: true;
  input: { zip: string; type: string; area: number; askingPrice: number };
  sampleSize: number;
  medianPricePerM2: number;
  q1PricePerM2: number;
  q3PricePerM2: number;
  askingPricePerM2: number;
  /** % above (+) or below (-) the sample median. */
  priceDeltaPct: number;
  verdict: "under" | "at" | "over" | "far_over";
  comparables: Comparable[];
} | {
  ok: false;
  reason: "no_matches" | "bad_input" | "fetch_failed";
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] != null) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/** Slugify an address into Boligsiden's `/adresse/<slug>` URL format. */
function boligsidenUrl(address: string, zipCode: string, city: string): string {
  const slug = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/å/g, "aa")
      .replace(/ø/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/[.,]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  return `https://www.boligsiden.dk/adresse/${slug(address)}-${zipCode}-${slug(city)}`;
}

export async function getComparables(
  zip: string,
  internalType: string,
  areaM2: number,
  askingPrice: number,
): Promise<ComparablesResult> {
  if (!zip || !areaM2 || areaM2 <= 10 || !askingPrice || askingPrice <= 0) {
    return { ok: false, reason: "bad_input" };
  }
  const bsType = TYPE_MAP[internalType] ?? "condo";

  // Filter to ±30 % on area — tight enough that the m² comparison is fair,
  // loose enough that small postal codes still get a sample.
  const minArea = Math.floor(areaM2 * 0.7);
  const maxArea = Math.ceil(areaM2 * 1.3);
  const url =
    `${BS_BASE}?zipCodes=${encodeURIComponent(zip)}` +
    `&addressTypes=${bsType}` +
    `&housingArea=${minArea}-${maxArea}` +
    `&per_page=40`;

  let json: unknown;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "nordinvest/1.0" },
      // 24 h cache — comparables are a market snapshot, not real-time.
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return { ok: false, reason: "fetch_failed" };
    json = await res.json();
  } catch {
    return { ok: false, reason: "fetch_failed" };
  }

  const cases: unknown[] = Array.isArray((json as { cases?: unknown[] })?.cases)
    ? ((json as { cases: unknown[] }).cases)
    : [];

  const rows: Comparable[] = [];
  for (const raw of cases) {
    const c = raw as Record<string, unknown>;
    const addr = (c.address ?? {}) as Record<string, unknown>;
    const price = Number(c.priceCash);
    const area = Number(c.housingArea);
    if (!price || price <= 0 || !area || area <= 10) continue;
    const address = `${addr.roadName ?? ""} ${addr.houseNumber ?? ""}`.trim();
    const city = String(addr.cityName ?? "");
    const zipCode = String(addr.zipCode ?? "");
    const rooms = Number(c.numberOfRooms);
    const yearBuilt = Number(c.yearBuilt);
    const daysOnMarket = Number(c.daysOnMarket);
    rows.push({
      address,
      city,
      zipCode,
      price,
      area,
      pricePerM2: price / area,
      rooms: Number.isFinite(rooms) && rooms > 0 ? rooms : undefined,
      yearBuilt: Number.isFinite(yearBuilt) && yearBuilt > 1500 ? yearBuilt : undefined,
      daysOnMarket: Number.isFinite(daysOnMarket) && daysOnMarket >= 0 ? daysOnMarket : undefined,
      url: boligsidenUrl(address, zipCode, city),
    });
  }

  if (rows.length < 3) return { ok: false, reason: "no_matches" };

  const sortedPpm2 = rows.map((r) => r.pricePerM2).sort((a, b) => a - b);
  const median = quantile(sortedPpm2, 0.5);
  const q1 = quantile(sortedPpm2, 0.25);
  const q3 = quantile(sortedPpm2, 0.75);
  const askingPerM2 = askingPrice / areaM2;
  const delta = ((askingPerM2 - median) / median) * 100;

  let verdict: "under" | "at" | "over" | "far_over";
  if (delta <= -5) verdict = "under";
  else if (delta < 5) verdict = "at";
  else if (delta < 15) verdict = "over";
  else verdict = "far_over";

  // Return the closest 6 by absolute price/m² distance so the UI can list them.
  const closest = rows
    .slice()
    .sort((a, b) => Math.abs(a.pricePerM2 - median) - Math.abs(b.pricePerM2 - median))
    .slice(0, 6);

  return {
    ok: true,
    input: { zip, type: bsType, area: areaM2, askingPrice },
    sampleSize: rows.length,
    medianPricePerM2: median,
    q1PricePerM2: q1,
    q3PricePerM2: q3,
    askingPricePerM2: askingPerM2,
    priceDeltaPct: delta,
    verdict,
    comparables: closest,
  };
}
