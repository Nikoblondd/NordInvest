import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Curated zip pools per region. Boligsiden's /search/cases requires a
// zipCode filter, so every region is an explicit list of postnumre — and a
// property is only accepted if its own zip is in that list (see toProperty).
//
// Landsdele follow the geography a player expects: "Sjælland" is the island
// (+ København, Lolland-Falster, Møn) — NOT Bornholm; "Jylland" excludes the
// ferry islands Fanø, Samsø and Læsø. Cities are the city's own kommune only.
const ZIP_POOLS: Record<string, string[]> = {
  "hele-dk": [
    // Storkøbenhavn
    "1050", "1600", "2100", "2200", "2300", "2400", "2500", "2600", "2700",
    "2800", "2820", "2860", "2900", "2920", "2960",
    // Sjælland øvrige + Bornholm
    "3000", "3400", "3450", "3480", "3500", "3520", "3700",
    "4000", "4200", "4300", "4400", "4600", "4700", "4800", "4900",
    // Fyn
    "5000", "5200", "5220", "5260", "5500", "5600", "5700", "5800",
    // Jylland
    "6000", "6100", "6400", "6500", "6700", "6800", "6900",
    "7000", "7100", "7400", "7500", "7700", "7800",
    "8000", "8200", "8210", "8220", "8230", "8240", "8260", "8270",
    "8600", "8700", "8800", "8900",
    "9000", "9200", "9210", "9220", "9400", "9700", "9900",
  ],
  sjaelland: [
    "1050", "1600", "2100", "2200", "2300", "2400", "2500", "2600",
    "2700", "2720", "2730", "2740", "2750", "2760", "2770", "2800", "2820",
    "2830", "2840", "2850", "2860", "2870", "2880", "2900", "2920", "2930",
    "2950", "2960", "2970", "2980", "2990",
    "3000", "3050", "3060", "3070", "3100", "3140", "3150", "3200", "3230",
    "3300", "3400", "3450", "3460", "3480", "3500", "3520", "3540", "3550",
    "3600", "3630", "3660", "3670",
    "4000", "4030", "4040", "4050", "4060", "4070", "4100", "4130", "4140",
    "4160", "4171", "4174", "4180", "4190", "4200", "4220", "4230", "4241",
    "4243", "4250", "4261", "4270", "4281", "4291", "4293", "4295", "4296",
    "4300", "4320", "4330", "4340", "4350", "4360", "4370", "4390", "4400",
    "4420", "4440", "4450", "4460", "4470", "4480", "4490", "4500", "4520",
    "4534", "4540", "4550", "4560", "4571", "4572", "4573", "4581", "4583",
    "4591", "4592", "4593", "4600", "4622", "4623", "4632", "4640", "4652",
    "4653", "4654", "4660", "4671", "4672", "4681", "4682", "4683", "4684",
    "4690", "4700", "4720", "4733", "4735", "4736", "4750", "4760", "4771",
    "4772", "4773", "4780", "4791", "4792", "4793", "4795", "4800", "4840",
    "4850", "4862", "4863", "4871", "4872", "4873", "4874", "4880", "4891",
    "4892", "4894", "4895", "4900", "4912", "4913", "4920", "4930", "4941",
    "4943", "4944", "4951", "4952", "4953", "4960", "4970", "4983", "4990",
  ],
  fyn: [
    "5000", "5200", "5210", "5220", "5230", "5240", "5250", "5260", "5270",
    "5290", "5300", "5320", "5330", "5350", "5370", "5380", "5390", "5400",
    "5450", "5462", "5463", "5464", "5466", "5471", "5474", "5485", "5491",
    "5492", "5500", "5540", "5550", "5560", "5580", "5591", "5592", "5600",
    "5610", "5620", "5631", "5642", "5672", "5683", "5690", "5700", "5750",
    "5762", "5771", "5772", "5792", "5800", "5853", "5854", "5856", "5863",
    "5871", "5874", "5881", "5882", "5883", "5884", "5892", "5900", "5932",
    "5935", "5953", "5960", "5970", "5985",
  ],
  jylland: [
    "6000", "6040", "6051", "6052", "6064", "6070", "6091", "6092", "6093",
    "6094", "6100", "6200", "6210", "6230", "6240", "6280", "6300", "6310",
    "6320", "6330", "6340", "6360", "6372", "6392", "6400", "6430", "6440",
    "6470", "6500", "6510", "6520", "6534", "6535", "6541", "6560", "6580",
    "6600", "6621", "6622", "6623", "6630", "6640", "6650", "6660", "6670",
    "6682", "6683", "6690", "6700", "6705", "6710", "6715", "6731",
    "6740", "6752", "6753", "6760", "6771", "6780", "6792", "6800", "6818",
    "6823", "6830", "6840", "6851", "6852", "6853", "6855", "6857", "6862",
    "6870", "6880", "6893", "6900", "6920", "6933", "6940", "6950", "6960",
    "6971", "6973", "6980", "6990",
    "7000", "7100", "7120", "7130", "7140", "7150", "7160", "7171", "7173",
    "7182", "7183", "7184", "7190", "7200", "7250", "7260", "7270", "7280",
    "7300", "7321", "7323", "7330", "7361", "7362", "7400", "7430", "7441",
    "7442", "7451", "7470", "7480", "7490", "7500", "7540", "7550", "7560",
    "7570", "7620", "7650", "7660", "7673", "7680", "7700", "7730", "7741",
    "7742", "7752", "7755", "7760", "7770", "7790", "7800", "7830", "7840",
    "7850", "7860", "7870", "7884", "7900", "7950", "7960", "7970", "7980",
    "7990",
    "8000", "8200", "8210", "8220", "8230", "8240", "8250", "8260", "8270",
    "8300", "8310", "8320", "8330", "8340", "8350", "8355", "8361",
    "8362", "8380", "8381", "8382", "8400", "8410", "8420", "8444", "8450",
    "8462", "8464", "8471", "8472", "8500", "8520", "8530", "8541", "8543",
    "8544", "8550", "8560", "8570", "8581", "8585", "8586", "8592", "8600",
    "8620", "8632", "8641", "8643", "8653", "8654", "8660", "8670", "8680",
    "8700", "8721", "8722", "8723", "8732", "8740", "8751", "8752", "8762",
    "8763", "8765", "8766", "8781", "8783", "8800", "8830", "8840", "8850",
    "8860", "8870", "8881", "8882", "8883", "8900", "8920", "8930", "8940",
    "8950", "8960", "8961", "8963", "8970", "8981", "8983", "8990",
    "9000", "9100", "9200", "9210", "9220", "9230", "9240", "9260", "9270",
    "9280", "9293", "9300", "9310", "9320", "9330", "9340", "9352", "9362",
    "9370", "9380", "9381", "9382", "9400", "9430", "9440", "9460", "9480",
    "9490", "9492", "9493", "9500", "9510", "9520", "9530", "9541", "9550",
    "9560", "9574", "9575", "9600", "9610", "9620", "9631", "9632", "9640",
    "9670", "9681", "9690", "9700", "9740", "9750", "9760", "9800", "9830",
    "9850", "9870", "9881", "9900", "9970", "9981", "9982", "9990",
  ],
  kbh: [
    "1050", "1051", "1150", "1200", "1250", "1300", "1350", "1400", "1450",
    "1500", "1550", "1600", "1650", "1700", "1750", "1800", "1850", "1870",
    "1900", "1950", "2000", "2100", "2200", "2300", "2400", "2450", "2500",
    "2600", "2610", "2620", "2630", "2635", "2640", "2650", "2660", "2665",
    "2670", "2680", "2690", "2700", "2720", "2730", "2740", "2750", "2760",
    "2770", "2791", "2800", "2820", "2830", "2840", "2850", "2860", "2870",
    "2880", "2900", "2920", "2930", "2942", "2950", "2960", "2970", "2980",
    "2990",
  ],
  aarhus: ["8000", "8200", "8210", "8220", "8230", "8240", "8250", "8260", "8270", "8310", "8361", "8381"],
  odense: ["5000", "5200", "5210", "5220", "5230", "5240", "5250", "5260", "5270"],
  aalborg: ["9000", "9200", "9210", "9220", "9270", "9310", "9400"],
  esbjerg: ["6700", "6705", "6710", "6715"],
  vejle: ["7100", "7120", "7080", "7300"],
  randers: ["8900", "8920", "8930", "8940", "8960"],
  kolding: ["6000", "6070", "6091", "6092", "6093"],
  horsens: ["8700", "8740", "8751", "8752", "8762"],
  roskilde: ["4000", "4040", "4130"],
  helsingoer: ["3000", "3050", "3060"],
  fredensborg: ["3480", "2980", "2990"],
  hilleroed: ["3400", "3320"],
  koege: ["4600", "4623", "4632", "4681"],
  naestved: ["4700", "4736", "4160", "4171", "4684"],
  slagelse: ["4200", "4220", "4230"],
  holbaek: ["4300", "4340", "4390", "4420", "4450"],
  frederikshavn: ["9900", "9970", "9982"],
  silkeborg: ["8600", "8620", "8632", "8641", "8653"],
  viborg: ["8800", "8830", "8840", "8850"],
  herning: ["7400", "7451", "7480", "7490"],
};

const PER_PAGE = 60;
const VILLA_PER_PAGE = 20;
// Boligsiden occasionally stalls on deep pages. Cap each call, and stop
// starting new ones once the game has been building for this long — a game
// with slightly fewer candidates beats a spinner (and Vercel's 30s limit).
const FETCH_TIMEOUT_MS = 6000;
const BUILD_BUDGET_MS = 12000;

type BsImageSource = { url?: string; size?: { width?: number; height?: number } };
type BsImage = { url?: string; imageSources?: BsImageSource[] };

type BsCase = {
  priceCash?: number;
  housingArea?: number;
  numberOfRooms?: number;
  yearBuilt?: number;
  energyLabel?: string;
  monthlyExpense?: number;
  addressType?: string;
  caseID?: string | number;
  caseUrl?: string;
  slug?: string;
  defaultImage?: BsImage;
  images?: BsImage[];
  address?: {
    roadName?: string;
    houseNumber?: string | number;
    letter?: string;
    floor?: string;
    door?: string;
    zipCode?: string | number;
    zip?: { zipCode?: string | number };
    cityName?: string;
  };
};

// Boligsiden serves each photo in ~6 sizes (100x80 up to 1440x960) under
// imageSources[]. Pick the biggest that's ≤1500px wide — high-quality enough
// for the game gallery, not overkill on payload.
function pickImageUrl(img: BsImage | undefined): string | null {
  if (!img) return null;
  if (typeof img.url === "string" && img.url) return img.url;
  const srcs = Array.isArray(img.imageSources) ? img.imageSources : [];
  if (srcs.length === 0) return null;
  const scored = srcs
    .filter((s) => typeof s.url === "string" && s.url)
    .map((s) => ({ url: s.url!, w: s.size?.width ?? 0 }));
  if (scored.length === 0) return null;
  const under = scored.filter((s) => s.w > 0 && s.w <= 1500).sort((a, b) => b.w - a.w);
  return (under[0] ?? scored[scored.length - 1]).url;
}

type GameProperty = {
  id: string;
  price: number;
  area: number;
  rooms?: number;
  yearBuilt?: number;
  energyLabel?: string;
  monthlyExpenses?: number;
  propertyType?: string;
  address: string;
  city: string;
  zipCode: string;
  images: string[];
  /** The real listing page (mægler), with Boligsiden as fallback. */
  listingUrl?: string;
};

// Bare land has nothing to look at — keep it out of the game.
const EXCLUDED_TYPES = new Set(["full year plot", "plot", "allotment"]);

function toProperty(c: BsCase, requestedZip: string): GameProperty | null {
  if (c.addressType && EXCLUDED_TYPES.has(c.addressType)) return null;
  const price = typeof c.priceCash === "number" ? c.priceCash : 0;
  const area = typeof c.housingArea === "number" ? c.housingArea : 0;
  if (price < 200000 || price > 50000000) return null;
  if (area < 15 || area > 2000) return null;

  const a = c.address ?? {};
  const zipCode = String(a.zipCode ?? a.zip?.zipCode ?? "");
  // Only accept homes that are really in the zip we asked for, so a region
  // can never leak listings from somewhere else.
  if (zipCode !== requestedZip) return null;
  const city = String(a.cityName ?? "");
  if (!city) return null;

  const images: string[] = [];
  const hero = pickImageUrl(c.defaultImage);
  if (hero) images.push(hero);
  for (const img of c.images ?? []) {
    const u = pickImageUrl(img);
    if (u && !images.includes(u)) images.push(u);
  }
  // Games are visual — need at least 3 real photos to be fun to guess
  if (images.length < 3) return null;

  const streetParts = [
    a.roadName,
    [a.houseNumber, a.letter].filter(Boolean).join(""),
    [a.floor, a.door].filter(Boolean).join("."),
  ].filter(Boolean);
  const address = `${streetParts.join(" ")}, ${zipCode} ${city}`.trim();

  // Stable id — the same home always gets the same id, so "seen" lists work
  // across games and devices.
  const id =
    typeof c.caseID === "string" || typeof c.caseID === "number"
      ? `bs-${c.caseID}`
      : `bs-${address.toLowerCase()}`;

  const listingUrl =
    typeof c.caseUrl === "string" && /^https?:\/\//.test(c.caseUrl)
      ? c.caseUrl
      : c.slug
      ? `https://www.boligsiden.dk/adresse/${encodeURIComponent(c.slug)}`
      : undefined;

  return {
    id,
    price,
    area,
    rooms: typeof c.numberOfRooms === "number" && c.numberOfRooms > 0 ? c.numberOfRooms : undefined,
    yearBuilt:
      typeof c.yearBuilt === "number" && c.yearBuilt > 1700 && c.yearBuilt <= 2100
        ? c.yearBuilt
        : undefined,
    energyLabel:
      c.energyLabel && /^[A-G]\d?$/i.test(c.energyLabel) ? c.energyLabel.toUpperCase() : undefined,
    monthlyExpenses:
      typeof c.monthlyExpense === "number" && c.monthlyExpense > 0 ? c.monthlyExpense : undefined,
    propertyType: c.addressType,
    address: address.slice(0, 140),
    city,
    zipCode,
    images: images.slice(0, 15),
    listingUrl,
  };
}

/* ---------------- fetching ---------------- */

// totalHits per zip (+ type filter), remembered across requests on a warm
// instance so we can jump straight to a random page instead of always page 1.
const totals = new Map<string, { n: number; at: number }>();
const TOTAL_TTL = 6 * 60 * 60 * 1000;

async function fetchPage(zip: string, page: number, extra: string, perPage: number): Promise<{ cases: BsCase[]; total: number }> {
  try {
    const res = await fetch(
      `https://api.boligsiden.dk/search/cases?zipCodes=${zip}&per_page=${perPage}&page=${page}${extra}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          Accept: "application/json,*/*;q=0.1",
          "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
        },
        // Responses run 1-2MB; above Next's cache limit and every game wants
        // a random slice anyway.
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!res.ok) return { cases: [], total: 0 };
    const j = (await res.json()) as { cases?: BsCase[]; totalHits?: number };
    return {
      cases: Array.isArray(j.cases) ? j.cases : [],
      total: typeof j.totalHits === "number" ? j.totalHits : 0,
    };
  } catch {
    return { cases: [], total: 0 };
  }
}

/**
 * Up to `want` unseen homes from one zip. Starts on a random page of the
 * zip's listings (so repeat games don't all draw from the same first page),
 * walks further random pages while it keeps hitting homes the player has
 * already seen, and adds a villa-only slice so city zips aren't all condos.
 */
async function candidatesForZip(zip: string, exclude: Set<string>, want: number, deadline: number): Promise<GameProperty[]> {
  const out: GameProperty[] = [];
  const seen = new Set<string>();
  const take = (cases: BsCase[]) => {
    for (const c of shuffle(cases)) {
      if (out.length >= want) return;
      const p = toProperty(c, zip);
      if (!p || exclude.has(p.id) || seen.has(p.id) || seen.has(p.address)) continue;
      seen.add(p.id);
      seen.add(p.address);
      out.push(p);
    }
  };

  async function walk(extra: string, perPage: number, maxPages: number, target: number) {
    const key = `${zip}${extra}`;
    const cached = totals.get(key);
    const known = cached && Date.now() - cached.at < TOTAL_TTL ? cached.n : null;
    let pages = known != null ? Math.max(1, Math.ceil(known / perPage)) : null;
    const tried = new Set<number>();
    let page = pages ? 1 + Math.floor(Math.random() * pages) : 1;
    for (let i = 0; i < maxPages && out.length < target && Date.now() < deadline; i++) {
      tried.add(page);
      const r = await fetchPage(zip, page, extra, perPage);
      if (r.total) {
        totals.set(key, { n: r.total, at: Date.now() });
        pages = Math.max(1, Math.ceil(r.total / perPage));
      }
      take(r.cases);
      if (!pages || tried.size >= pages) break;
      const untried = Array.from({ length: pages }, (_, k) => k + 1).filter((k) => !tried.has(k));
      if (!untried.length) break;
      page = untried[Math.floor(Math.random() * untried.length)];
    }
  }

  await Promise.all([
    walk("", PER_PAGE, 3, Math.ceil(want * 0.7)),
    walk("&addressTypes=villa", VILLA_PER_PAGE, 2, want),
  ]);
  // Top up from the mixed listing if the villa slice came up short.
  if (out.length < want && Date.now() < deadline) await walk("", PER_PAGE, 2, want);
  return out;
}

/* ---------------- variety ---------------- */

/**
 * Round-robin over landsdele (first zip digit) so a whole-country game visits
 * København, Sjælland, Fyn and Jylland instead of three zips in one city.
 * Within a landsdel, prefer zips from neighbourhoods (first two digits) not
 * used yet.
 */
function spreadZips(pool: string[], n: number): string[] {
  const byDigit = new Map<string, string[]>();
  for (const z of shuffle(pool)) {
    const k = z[0];
    if (!byDigit.has(k)) byDigit.set(k, []);
    byDigit.get(k)!.push(z);
  }
  const groups = shuffle(Array.from(byDigit.values()));
  const usedPrefix = new Set<string>();
  const out: string[] = [];
  while (out.length < n && groups.some((g) => g.length)) {
    for (const g of groups) {
      if (out.length >= n || g.length === 0) continue;
      const i = g.findIndex((z) => !usedPrefix.has(z.slice(0, 2)));
      const [z] = g.splice(i >= 0 ? i : 0, 1);
      usedPrefix.add(z.slice(0, 2));
      out.push(z);
    }
  }
  return out;
}

function priceBand(price: number): number {
  if (price < 1_500_000) return 0;
  if (price < 3_000_000) return 1;
  if (price < 5_000_000) return 2;
  if (price < 8_000_000) return 3;
  return 4;
}

/** Normalise Boligsiden's types so "villa" vs "villa apartment" etc. count right. */
function typeKey(t: string | undefined): string {
  const s = (t || "").toLowerCase();
  if (s.includes("farm")) return "farm";
  if (s.includes("holiday")) return "holiday";
  if (s.includes("terraced")) return "terraced";
  if (s.includes("cooperative")) return "cooperative";
  if (s === "villa") return "villa";
  return "apartment"; // condo, villa apartment
}

function pickDiverse(cands: GameProperty[], count: number): GameProperty[] {
  const left = shuffle(cands);
  const chosen: GameProperty[] = [];
  const n = { zip: new Map<string, number>(), area: new Map<string, number>(), region: new Map<string, number>(), type: new Map<string, number>(), band: new Map<number, number>() };
  const get = <K,>(m: Map<K, number>, k: K) => m.get(k) ?? 0;
  const bump = <K,>(m: Map<K, number>, k: K) => m.set(k, get(m, k) + 1);

  while (chosen.length < count && left.length) {
    let best = 0;
    let bestScore = Infinity;
    for (let i = 0; i < left.length; i++) {
      const p = left[i];
      const score =
        get(n.zip, p.zipCode) * 12 +
        get(n.area, p.zipCode.slice(0, 2)) * 4 +
        get(n.region, p.zipCode[0]) * 2 +
        get(n.type, typeKey(p.propertyType)) * 3 +
        get(n.band, priceBand(p.price)) * 3 +
        Math.random(); // tie-break so games differ
      if (score < bestScore) { bestScore = score; best = i; }
    }
    const [p] = left.splice(best, 1);
    chosen.push(p);
    bump(n.zip, p.zipCode);
    bump(n.area, p.zipCode.slice(0, 2));
    bump(n.region, p.zipCode[0]);
    bump(n.type, typeKey(p.propertyType));
    bump(n.band, priceBand(p.price));
  }
  return chosen;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------- handler ---------------- */

async function buildGame(region: string, count: number, exclude: Set<string>) {
  const pool = ZIP_POOLS[region];
  if (!pool) {
    return NextResponse.json({ ok: false, error: "unknown_region" }, { status: 400 });
  }

  // Few zips (a single city) → each zip must supply several homes.
  const perZipWant = Math.max(2, Math.ceil((count * 1.6) / Math.min(pool.length, count + 4)));

  const deadline = Date.now() + BUILD_BUDGET_MS;
  const remaining = spreadZips(pool, pool.length);
  const candidates: GameProperty[] = [];
  const ids = new Set<string>();
  let chosen: GameProperty[] = [];

  // Batches of zips until we can fill the game with unseen homes (or the
  // region runs out). First batch is count+4 zips; later ones top up.
  for (let batch = 0; batch < 3 && remaining.length && Date.now() < deadline; batch++) {
    const size = batch === 0 ? Math.min(remaining.length, count + 4) : Math.min(remaining.length, 8);
    const zips = remaining.splice(0, size);
    const perZip = await mapLimit(zips, 8, (zip) => candidatesForZip(zip, exclude, perZipWant, deadline));
    for (const p of perZip.flat()) {
      if (ids.has(p.id)) continue;
      ids.add(p.id);
      candidates.push(p);
    }
    chosen = pickDiverse(candidates, count);
    if (chosen.length >= count) break;
  }

  if (chosen.length < 3) {
    return NextResponse.json(
      {
        ok: false,
        error: exclude.size > 0 ? "exhausted" : "not_enough_properties",
        got: chosen.length,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    region,
    count: chosen.length,
    // Fewer than asked for = the player has seen almost everything here.
    exhausted: chosen.length < count,
    properties: shuffle(chosen),
  });
}

function parseCount(v: unknown): number {
  const n = Math.floor(Number(v) || 10);
  return Math.max(3, Math.min(30, n));
}

export async function GET(req: NextRequest) {
  const region = (req.nextUrl.searchParams.get("region") || "hele-dk").toLowerCase();
  return buildGame(region, parseCount(req.nextUrl.searchParams.get("count")), new Set());
}

/** POST { region, count, exclude: string[] } — exclude = ids the player has already seen. */
export async function POST(req: NextRequest) {
  let body: { region?: unknown; count?: unknown; exclude?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }
  const region = String(body.region || "hele-dk").toLowerCase();
  const exclude = new Set(
    (Array.isArray(body.exclude) ? body.exclude : [])
      .filter((x): x is string => typeof x === "string" && x.length < 120)
      .slice(-5000),
  );
  return buildGame(region, parseCount(body.count), exclude);
}
