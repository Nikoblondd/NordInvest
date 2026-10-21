// Portal adapters for the NordInvest agent. Both sources are clean public JSON
// APIs (no HTML scraping), which is why this stays reliable. Each adapter knows
// how to page through the WHOLE country and normalise a listing.
//
// Resilience by design: every important field is read through a list of
// candidate paths (pickNum/pickStr), so if a portal renames a field the adapter
// usually keeps working by falling back to a known alias — no code change and no
// LLM needed. Only when ALL candidates fail does the optional self-repair kick in
// (see repair.mjs). Mapping candidates live in MAPPINGS so repair can extend them.

import { ZIP_TO_MUNI, zipToMunicipality } from "./kommuner.mjs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

// ── resilient HTTP ──────────────────────────────────────────────────────────
export async function httpGetJson(url, { timeout = 20000, retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) return { ok: false, status: res.status, data: null };
      return { ok: true, status: res.status, data: await res.json() };
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (attempt < retries) await sleep(500 * Math.pow(2, attempt) + Math.random() * 300);
    }
  }
  return { ok: false, status: 0, data: null, error: String(lastErr) };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Page through a task FAST by fetching pages in parallel waves, stopping at the
// end (an empty or partial page). maxPages=0 → unlimited (scrape everything).
// Returns all normalised listings plus stats/flags for the caller.
export async function paginate(task, { maxPages = 0, concurrency = 6, delayMs = 200 } = {}) {
  const unlimited = !maxPages || maxPages <= 0;
  const out = [];
  let rowsSeen = 0, sample = null, hardFail = false, shapeChanged = false, page = 1, stop = false;

  while (!stop) {
    const batch = [];
    for (let i = 0; i < concurrency; i++) {
      const pnum = page + i;
      if (!unlimited && pnum > maxPages) break;
      batch.push(pnum);
    }
    if (batch.length === 0) break;

    const results = await Promise.all(
      batch.map(async (pnum) => ({ pnum, ...(await httpGetJson(task.page(pnum))) })),
    );
    results.sort((a, b) => a.pnum - b.pnum);

    for (const r of results) {
      if (!r.ok) {
        // A transient error (network/429/5xx) is a real failure. A client error
        // (e.g. 400/404) AFTER we already have data just means we hit the
        // portal's deep-pagination cap — treat that as a clean end, not a fault.
        const transient = r.status === 0 || r.status === 429 || r.status >= 500;
        if (rowsSeen > 0 && !transient) { stop = true; continue; }
        hardFail = true; stop = true; continue;
      }
      const rows = task.rows(r.data);
      // Portals return `null` (not []) once you page past the end — that's the
      // end of data, NOT a shape change. Only a null on the very first page,
      // before we've seen anything, means the response structure actually broke.
      if (rows == null) { if (rowsSeen === 0) shapeChanged = true; stop = true; continue; }
      if (rows.length === 0) { stop = true; continue; } // reached the end
      for (const row of rows) {
        if (!sample) sample = row;
        const n = task.norm(row);
        if (n) out.push(n);
      }
      rowsSeen += rows.length;
    }
    page += batch.length;
    if (!stop) await sleep(delayMs);
  }
  return { listings: out, rowsSeen, sample, hardFail, shapeChanged };
}

// ── candidate-path pickers ──────────────────────────────────────────────────
function at(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function pickNum(obj, paths) {
  for (const p of paths) {
    const n = Number(at(obj, p));
    if (Number.isFinite(n) && n !== 0) return n;
  }
  // allow a legit 0 only if some path resolves to exactly 0
  for (const p of paths) {
    const v = at(obj, p);
    if (v === 0 || v === "0") return 0;
  }
  return null;
}
function pickStr(obj, paths) {
  for (const p of paths) {
    const v = at(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

// Field-path candidates per source. repair.mjs may unshift newly-found paths.
export const MAPPINGS = {
  boligsiden: {
    id: ["caseID", "caseId", "id", "slug"],
    price: ["priceCash", "price", "cashPrice", "salesPrice"],
    area: ["housingArea", "livingArea", "area"],
    rooms: ["numberOfRooms", "rooms", "roomCount"],
    yearBuilt: ["yearBuilt", "buildYear", "constructionYear"],
    zip: ["address.zipCode", "zipCode"],
  },
  ejendomstorvet: {
    id: ["id", "listing_id"],
    price: ["sales_price_dkk", "salesPriceDkk", "price", "sales_price"],
    area: ["floor_area_m2", "floorAreaM2", "area_m2"],
    zip: ["zip_code", "zipCode"],
    returnPercent: ["return_percent", "returnPercent", "yield"],
    operatingCost: ["yearly_operating_cost_dkk", "operating_cost_dkk"],
  },
};

// Coarse zip → province code, matching the codes the app's investment search
// uses (so DB-served investment deals filter by the same regions). Unmapped zips
// return null (searched nationally), mirroring the live behaviour.
export function regionFromZip(zip) {
  const z = Number(zip);
  if (!Number.isFinite(z) || z <= 0) return null;
  if (z >= 1000 && z <= 2499) return "DK011"; // København by
  if (z >= 4000 && z <= 4099) return "DK021"; // Roskilde/Østsjælland
  if (z >= 5000 && z <= 5999) return "DK031"; // Fyn
  if (z >= 8000 && z <= 8999) return "DK042"; // Østjylland (Aarhus/Horsens/Randers)
  if (z >= 9000 && z <= 9999) return "DK050"; // Nordjylland (Aalborg)
  return null;
}

// ── Boligsiden: whole residential market (EDC/Home/Nybolig/Danbolig/…) ────────
function pickImage(sources) {
  if (!Array.isArray(sources)) return null;
  const withW = sources.filter((s) => s?.url && s?.size?.width).sort((a, b) => a.size.width - b.size.width);
  if (!withW.length) return sources.find((s) => s?.url)?.url ?? null;
  const good = [...withW].reverse().find((s) => s.size.width <= 900);
  return (good ?? withW[withW.length - 1]).url;
}

function normBoligsiden(c, queryType) {
  const m = MAPPINGS.boligsiden;
  const a = c?.address ?? {};
  const price = pickNum(c, m.price);
  if (!price || price <= 0) return null;
  const externalId = pickStr(c, m.id) ?? `${a.roadName ?? ""}-${price}`;
  const road = [a.roadName, a.houseNumber].filter(Boolean).join(" ");
  const floorDoor = [a.floor && a.floor !== "0" ? `${a.floor}.` : null, a.door].filter(Boolean).join(" ");
  const address = [road + (floorDoor ? ` ${floorDoor}` : ""), `${a.zipCode ?? ""} ${a.cityName ?? ""}`.trim()]
    .filter(Boolean).join(", ");
  return {
    source: "boligsiden",
    market: "bolig",
    externalId: String(externalId),
    url: c?.caseUrl ?? "",
    address, road,
    zip: pickNum(c, m.zip) ?? 0,
    city: a.cityName ?? "",
    // stored in the SAME vocabulary the app filters by (the type we searched),
    // not the portal's free-text addressType field
    type: queryType ?? c?.addressType ?? "condo",
    subcategory: null,
    municipality: a?.municipality?.slug ?? null,
    region: a?.province?.slug ?? null,
    price,
    area: pickNum(c, m.area),
    rooms: pickNum(c, m.rooms),
    yearBuilt: pickNum(c, m.yearBuilt),
    energyLabel: typeof c?.energyLabel === "string" ? c.energyLabel.toUpperCase() : null,
    returnPercent: null,
    operatingCost: null,
    image: pickImage(c?.defaultImage?.imageSources) ?? null,
    lat: c?.coordinates?.lat ?? null,
    lon: c?.coordinates?.lon ?? null,
    // BFE number: the key Ejerfortegnelsen's tinglyste sales are joined on.
    bfe: Array.isArray(a.bfeNumbers) && a.bfeNumbers.length === 1 ? Number(a.bfeNumbers[0]) : null,
  };
}

// ── Ejendomstorvet: whole investment/commercial market ────────────────────────
const ET_SITE = "https://www.ejendomstorvet.dk";
function etImage(url) {
  if (!url || typeof url !== "string") return null;
  return url.includes("?") ? url : `${url}?class=listingimagebannermax`;
}
function normEjendomstorvet(r) {
  const m = MAPPINGS.ejendomstorvet;
  const price = pickNum(r, m.price);
  if (!price || price <= 0) return null;
  const externalId = pickStr(r, m.id) ?? r?.listing_url ?? String(price);
  const rel = r?.listing_url || "";
  return {
    source: "ejendomstorvet",
    market: "investering",
    externalId: String(externalId),
    url: rel.startsWith("http") ? rel : `${ET_SITE}${rel}`,
    address: r?.address ?? "",
    road: r?.street_name || (r?.address ? String(r.address).split(",")[0] : ""),
    zip: pickNum(r, m.zip) ?? 0,
    city: r?.zip_code_name ?? "",
    type: r?.subcategory ?? null,
    subcategory: r?.subcategory ?? null,
    // pin the erhverv listing to its exact kommune via its zip
    municipality: zipToMunicipality(pickNum(r, m.zip)),
    region: regionFromZip(pickNum(r, m.zip)),
    price,
    area: pickNum(r, m.area),
    rooms: null,
    yearBuilt: null,
    energyLabel: Array.isArray(r?.energy_labels) && r.energy_labels[0] ? String(r.energy_labels[0]).toUpperCase() : null,
    returnPercent: pickNum(r, m.returnPercent),
    operatingCost: pickNum(r, m.operatingCost),
    image: etImage(r?.image_url),
    lat: pickNum(r, ["gis_y"]),
    lon: pickNum(r, ["gis_x"]),
  };
}

// Ejendomstorvet rental listings — RentalListing type. Gives documented
// commercial rent per m² per region, refreshed continuously. Stored with
// market="udlejning" so the reference-data builder can compute per-region
// rent medians the analyzer can cite.
function normEjendomstorvetRental(r) {
  const yearlyRent = Number(r?.yearly_rent_dkk);
  if (!Number.isFinite(yearlyRent) || yearlyRent <= 0) return null;
  const externalId = String(r?.id ?? r?.listing_url ?? yearlyRent);
  const rel = r?.listing_url || "";
  return {
    source: "ejendomstorvet",
    market: "udlejning",
    externalId,
    url: rel.startsWith("http") ? rel : `${ET_SITE}${rel}`,
    address: r?.address ?? "",
    road: r?.street_name || (r?.address ? String(r.address).split(",")[0] : ""),
    zip: pickNum(r, ["zip_code", "zipCode"]) ?? 0,
    city: r?.zip_code_name ?? "",
    type: r?.subcategory ?? null,
    subcategory: r?.subcategory ?? null,
    municipality: zipToMunicipality(pickNum(r, ["zip_code", "zipCode"])),
    region: regionFromZip(pickNum(r, ["zip_code", "zipCode"])),
    // Store yearly rent as price — that's what "price" means for a rental
    // listing. Per-m² derivation happens in the reference builder.
    price: yearlyRent,
    area: pickNum(r, ["floor_area_m2", "floorAreaM2"]),
    rooms: null,
    yearBuilt: null,
    energyLabel: null,
    // return_percent is repurposed to hold the portal's own kr/m²/år figure.
    // Handy for the reference builder + downstream consumers who don't want
    // to recompute price/area (which sometimes has rounding differences).
    returnPercent: pickNum(r, ["yearly_rent_floor_area_m2"]),
    operatingCost: pickNum(r, ["yearly_operating_cost_dkk"]),
    image: etImage(r?.image_url),
    lat: pickNum(r, ["gis_y"]),
    lon: pickNum(r, ["gis_x"]),
  };
}

// ── portal definitions (page the whole country) ──────────────────────────────
// addressTypes covered for the residential market — every ownership type a
// private buyer can own. These are the exact tokens Boligsiden's filter accepts
// (verified against the live API; note the space-form strings are required —
// "terraced" etc. return 400).
const BOLIG_TYPES = [
  "condo",            // ejerlejlighed
  "villa",            // villa
  "terraced house",   // rækkehus
  "cooperative",      // andelsbolig
  "villa apartment",  // villalejlighed
  "holiday house",    // fritidshus
  "farm",             // landejendom
  "hobby farm",       // lystejendom
];

// Boligsiden stops at page 200 (10.000 results) per search, so one nationwide
// search per type silently missed most villas (25.000 for sale, 8.800 seen).
// Searching each kommune on its own keeps every search far below the cap.
const KOMMUNER = Array.from(new Set(Object.values(ZIP_TO_MUNI))).sort();

export const PORTALS = [
  {
    name: "boligsiden",
    // one "task" per address type; each pages nationwide
    tasks: () =>
      KOMMUNER.flatMap((kommune) => BOLIG_TYPES.map((type) => ({
        label: `boligsiden/${kommune}/${type}`,
        pageSize: 50,
        page: (n) => `https://api.boligsiden.dk/search/cases?addressTypes=${encodeURIComponent(type)}&municipalities=${encodeURIComponent(kommune)}&perPage=50&page=${n}`,
        // A kommune with none of a type answers { cases: null, totalHits: 0 }: that is an empty list, not a broken format.
        rows: (d) => (Array.isArray(d?.cases) ? d.cases : d?.totalHits === 0 ? [] : null),
        norm: (row) => normBoligsiden(row, type),
      }))),
  },
  {
    name: "ejendomstorvet",
    tasks: () => [
      {
        label: "ejendomstorvet/investment",
        pageSize: 24,
        page: (n) =>
          `${ET_SITE}/api/v2/listings/search?listingTypes=InvestmentListing&sort=created_desc&page=${n}&resultOffset=${(n - 1) * 24}`,
        rows: (d) => (Array.isArray(d?.results) ? d.results : null),
        norm: normEjendomstorvet,
      },
      {
        // Commercial rentals — kontor/butik/lager. Gives us documented rent
        // pr. m² pr. år pr. region, so the analyzer can cite real market rent
        // instead of relying only on the DST HUS1 index.
        label: "ejendomstorvet/rental",
        pageSize: 24,
        page: (n) =>
          `${ET_SITE}/api/v2/listings/search?listingTypes=RentalListing&sort=created_desc&page=${n}&resultOffset=${(n - 1) * 24}`,
        rows: (d) => (Array.isArray(d?.results) ? d.results : null),
        norm: normEjendomstorvetRental,
      },
    ],
  },
];
