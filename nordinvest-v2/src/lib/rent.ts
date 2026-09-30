// Documented rent benchmark. The core problem with rental data in Denmark:
// no one publishes actual kr/m²/md by area — DST only ships a rent INDEX
// (HUS1, private / almene / andels × region × kvartal). BoligPortal + Boliga
// refuse to share ad data. So we build a triple-source benchmark:
//
//   1. Anchor per-zip baselines to a specific quarter (Q4 2024, plausible
//      current levels I've inspected against Ejendomsdanmark quarterly reports
//      + our own Ejendomstorvet scraping).
//   2. Multiply by DST HUS1's ratio: (latest index / anchor-quarter index).
//      This means the benchmark refreshes itself every quarter — with DST
//      as the citable source for the growth trajectory.
//   3. Overlay user-contributed observations from the analyses table
//      (property_data.rentObservation) when there are ≥5 per region — that
//      shifts the estimate toward what real people report seeing.
//
// The provenance tier is "Kalibreret estimat" — an honest middle ground:
// baseline is our judgment, growth is DST-official, observations are real.
// When user data density crosses ≥15 per region+type, we flip to "Dokumenteret".

const DST = "https://api.statbank.dk/v1/data/HUS1/JSONSTAT";

// 5 danske regioner. Zip → REGION code for HUS1.
export type RentRegion = "084" | "085" | "083" | "082" | "081" | "000";
export const RENT_REGION_LABEL: Record<RentRegion, string> = {
  "084": "Region Hovedstaden",
  "085": "Region Sjælland",
  "083": "Region Syddanmark",
  "082": "Region Midtjylland",
  "081": "Region Nordjylland",
  "000": "Hele landet",
};

export function rentRegionForZip(zip: number | null | undefined): RentRegion {
  if (zip == null) return "000";
  const z = Number(zip);
  if (!Number.isFinite(z)) return "000";
  if (z >= 1000 && z <= 3699) return "084"; // Hovedstaden (incl. Nordsjælland)
  if (z >= 4000 && z <= 4999) return "085"; // Sjælland
  if (z >= 5000 && z <= 5999) return "083"; // Fyn → Syddanmark
  if (z >= 6000 && z <= 7199) return "083"; // Syd- og Sønderjylland → Syddanmark
  if (z >= 7200 && z <= 8999) return "082"; // Vest- og Østjylland → Midtjylland
  if (z >= 9000 && z <= 9999) return "081"; // Nordjylland
  return "000";
}

// HUS1 EJENDOMSKATE. We use "552 Private boliger" — the market-relevant series
// (private udlejning has free rent-setting for post-1991 buildings). Andels-
// and almene-boliger are regulated and would give the wrong signal for a
// property-investment analysis.
const HUS1_CATEGORY = "552";

// Baseline levels — kr/m² pr. MÅNED for private udlejningsboliger, anchored
// to Q4 2024. Values are inspected against Ejendomsdanmark quarterly market
// reports and our own scraping of ejendomstorvet's rental section. Since HUS1
// grows/shrinks from a fixed quarter forward, updating the anchor date is a
// once-a-year manual calibration.
const ANCHOR_PERIOD = "2024K4";
const BASELINE_KR_M2_MONTH: Record<RentRegion, number> = {
  "084": 165, // Hovedstaden — København, Frederiksberg, Nordsjælland
  "085": 110, // Sjælland — Roskilde, Køge, Kalundborg …
  "083": 105, // Syddanmark — Odense, Kolding, Esbjerg
  "082": 118, // Midtjylland — Aarhus, Herning, Silkeborg
  "081": 95,  // Nordjylland — Aalborg
  "000": 115, // Hele landet
};

// Type multiplier over the regional baseline. Ejerlejligheder ≈ baseline,
// villaer og rækkehuse har typisk lidt lavere kr/m² (større areal) og
// andelsboliger ligger noget lavere pga. regulering.
function typeFactor(hint?: string | null): number {
  const t = (hint || "").toLowerCase();
  if (/andel|cooperative/.test(t)) return 0.72;
  if (/villa apartment|villalejlighed/.test(t)) return 0.98;
  if (/række|terraced/.test(t)) return 0.90;
  if (/villa|hus|enfamilie|house/.test(t)) return 0.85;
  return 1.0; // condo (ejerlejlighed) — the market default
}

type Series = { period: string; value: number }[];

async function fetchHus1Series(region: RentRegion): Promise<Series | null> {
  try {
    const url = `${DST}?REGION=${region}&EJENDOMSKATE=${HUS1_CATEGORY}&TAL=100&Tid=*`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const d = await res.json();
    const ds = d?.dataset;
    const values: number[] = ds?.value ?? [];
    const labels: Record<string, string> = ds?.dimension?.Tid?.category?.label ?? {};
    const idxByLabel: Record<string, string> = ds?.dimension?.Tid?.category?.index ?? {};
    // labels are already 2024K3, 2024K4 etc. — key them by their label so we
    // can look up the anchor quarter directly.
    const map: Record<string, number> = {};
    for (const [lbl, val] of Object.entries(labels)) {
      const i = Number(idxByLabel[lbl]);
      if (Number.isFinite(i) && Number.isFinite(values[i])) map[val] = values[i];
    }
    const series = Object.entries(map)
      .map(([period, value]) => ({ period, value }))
      .sort((a, b) => a.period.localeCompare(b.period));
    return series.length ? series : null;
  } catch {
    return null;
  }
}

export type RentBenchmark = {
  value: number; // kr/m²/md
  monthly: number; // kr/md for a typical unit at the input area (rounded to nearest 100)
  region: RentRegion;
  regionLabel: string;
  type: string;
  latestPeriod: string;
  growthPct: number; // % since anchor period
  anchorPeriod: string;
  source: string;
  tier: "kalibreret" | "documented"; // documented once user-obs density crosses threshold
  observations: number; // number of user rent observations behind this benchmark
};

// Read user-contributed rent observations for the region+type. Returns median
// kr/m²/md if we have ≥5 obs, plus the count. Server-side (service key) so
// this can run in the analyzer's API path where the client has no auth.
async function readUserObservations(
  region: RentRegion,
  type: string,
): Promise<{ median: number | null; count: number }> {
  const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL_BASE || !KEY) return { median: null, count: 0 };
  try {
    // property_data JSONB contains rentObservation:{krPerM2Month, region, type}
    // when a user submitted one. Filter server-side via ->> ops.
    const q = [
      "select=property_data",
      `property_data->rentObservation->>region=eq.${encodeURIComponent(region)}`,
      `property_data->rentObservation->>type=eq.${encodeURIComponent(type)}`,
      "limit=2000",
    ].join("&");
    const res = await fetch(`${URL_BASE}/rest/v1/analyses?${q}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return { median: null, count: 0 };
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const rows: any[] = await res.json();
    const vals: number[] = [];
    for (const r of rows) {
      const v = Number(r?.property_data?.rentObservation?.krPerM2Month);
      if (Number.isFinite(v) && v > 20 && v < 500) vals.push(v);
    }
    if (vals.length < 5) return { median: null, count: vals.length };
    vals.sort((a, b) => a - b);
    const mid = vals.length >> 1;
    const median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    return { median, count: vals.length };
  } catch {
    return { median: null, count: 0 };
  }
}

const roundToNearest = (n: number, step: number) => Math.round(n / step) * step;

// Documented rent benchmark for a specific property. Kalibreret = DST-anchored
// estimate; documented = ≥15 user observations overlay the DST estimate.
export async function getRentBenchmark(
  zip: number | null | undefined,
  typeHint: string | null | undefined,
  areaM2?: number | null,
): Promise<RentBenchmark | null> {
  const region = rentRegionForZip(zip);
  const baseline = BASELINE_KR_M2_MONTH[region];
  const factor = typeFactor(typeHint);
  const [series, obs] = await Promise.all([
    fetchHus1Series(region),
    readUserObservations(region, typeCanonical(typeHint)),
  ]);

  let value = baseline * factor; // pure baseline fallback
  let latestPeriod = ANCHOR_PERIOD;
  let growthPct = 0;
  if (series && series.length > 0) {
    const anchor = series.find((s) => s.period === ANCHOR_PERIOD);
    const latest = series[series.length - 1];
    if (anchor && anchor.value > 0 && latest?.value > 0) {
      const ratio = latest.value / anchor.value;
      value = baseline * factor * ratio;
      latestPeriod = latest.period;
      growthPct = Math.round((ratio - 1) * 1000) / 10;
    }
  }

  // User-observation overlay: weight blend when we have enough data.
  let tier: "kalibreret" | "documented" = "kalibreret";
  if (obs.median != null) {
    if (obs.count >= 15) {
      // trust user data as the primary signal, weight 70/30 toward users
      value = obs.median * 0.7 + value * 0.3;
      tier = "documented";
    } else {
      // early signal — subtle correction only
      value = obs.median * 0.35 + value * 0.65;
    }
  }

  const roundedPerM2 = Math.round(value * 10) / 10; // 1 decimal
  const monthly = areaM2 && areaM2 > 10 ? roundToNearest(roundedPerM2 * areaM2, 100) : Math.round(roundedPerM2 * 85);
  const source =
    tier === "documented"
      ? `${obs.count} bruger-observationer overlaid på DST HUS1 (${latestPeriod}, private boliger)`
      : `Kalibreret med DST HUS1 huslejeindeks (${latestPeriod}, private boliger). Basisniveau anker Q4 2024.`;

  return {
    value: roundedPerM2,
    monthly,
    region,
    regionLabel: RENT_REGION_LABEL[region],
    type: typeCanonical(typeHint),
    latestPeriod,
    growthPct,
    anchorPeriod: ANCHOR_PERIOD,
    source,
    tier,
    observations: obs.count,
  };
}

function typeCanonical(hint?: string | null): string {
  const t = (hint || "").toLowerCase();
  if (/andel|cooperative/.test(t)) return "cooperative";
  if (/villa apartment|villalejlighed/.test(t)) return "villa apartment";
  if (/række|terraced/.test(t)) return "terraced house";
  if (/villa|hus|enfamilie|house/.test(t)) return "villa";
  return "condo";
}
