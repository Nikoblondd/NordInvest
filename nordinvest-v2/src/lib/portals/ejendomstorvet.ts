// Ejendomstorvet search adapter — Denmark's marketplace for investment &
// commercial property. Unlike single homes, these are whole rental properties
// ("udlejningsejendomme") that publish a real starting yield ("afkast" /
// return_percent) and price, so the analysis rests on ACTUAL investor figures
// rather than an estimated rent.

export type InvestmentListing = {
  id: string;
  /** When the market agent first saw the listing (ISO), if it came from the dataset. */
  firstSeen?: string | null;
  municipality?: string | null;
  source: string; // "ejendomstorvet.dk"
  url: string; // absolute deep link
  image: string | null;
  title: string;
  address: string;
  road: string;
  zip: number;
  city: string;
  subcategory: string | null; // e.g. "Boligudlejning"
  price: number;
  returnPercent: number | null; // stated net yield (afkast)
  operatingCost: number | null; // yearly, DKK
  yearlyRent: number | null; // yearly, DKK (often null; return% is primary)
  area: number | null; // floor m²
  energyLabel: string | null;
  lat: number | null;
  lon: number | null;
};

const BASE = "https://www.ejendomstorvet.dk/api/v2/listings/search";
const SITE = "https://www.ejendomstorvet.dk";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export type EjendomstorvetParams = {
  province?: string; // e.g. "DK011"
  usageProposal?: number; // 9 = Boligudlejning
  pages?: number;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function num(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// The API returns bare image paths (…/<hash>.jpg) that 404 on their own — the
// CDN only serves them through an image-class transform. "listingimagebannermax"
// renders a crisp, card-sized image (≈880px wide), matching the residential
// cards' image quality.
export function etImage(url: any): string | null {
  if (!url || typeof url !== "string") return null;
  if (url.includes("class=")) return url; // already carries a transform
  // Any other query (e.g. "?ai=none" from the market dataset) still 404s.
  return `${url.split("?")[0]}?class=listingimagebannermax`;
}

function mapItem(r: any): InvestmentListing | null {
  const price = num(r?.sales_price_dkk);
  if (!price || price <= 0) return null;
  const road = r?.street_name || (r?.address ? String(r.address).split(",")[0] : "");
  const rel = r?.listing_url || "";
  return {
    id: String(r?.id ?? rel),
    source: "ejendomstorvet.dk",
    url: rel.startsWith("http") ? rel : `${SITE}${rel}`,
    image: etImage(r?.image_url),
    title: r?.title ?? "",
    address: r?.address ?? "",
    road,
    zip: num(r?.zip_code) ?? 0,
    city: r?.zip_code_name ?? "",
    subcategory: r?.subcategory ?? null,
    price,
    returnPercent: num(r?.return_percent),
    operatingCost: num(r?.yearly_operating_cost_dkk),
    yearlyRent: num(r?.yearly_rent_dkk),
    area: num(r?.floor_area_m2),
    energyLabel: Array.isArray(r?.energy_labels) && r.energy_labels[0] ? String(r.energy_labels[0]).toUpperCase() : null,
    lat: num(r?.gis_y),
    lon: num(r?.gis_x),
  };
}

const PAGE_SIZE = 24;

async function fetchInvPage(params: EjendomstorvetParams, page: number): Promise<InvestmentListing[]> {
  const q = new URLSearchParams();
  q.set("sort", "created_desc"); // newest first — the pool stays current
  q.set("page", String(page));
  q.set("resultOffset", String((page - 1) * PAGE_SIZE));
  q.set("listingTypes", "InvestmentListing");
  if (params.province) q.set("provinces", params.province);
  if (params.usageProposal) q.set("usageProposals", String(params.usageProposal));
  // NB: Ejendomstorvet's price params are unreliable, so the authoritative
  // price/area/return filtering happens in our own code after fetching.
  try {
    const res = await fetch(`${BASE}?${q.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.map(mapItem).filter((x: InvestmentListing | null): x is InvestmentListing => x !== null);
  } catch {
    return [];
  }
}

export async function searchEjendomstorvet(params: EjendomstorvetParams): Promise<InvestmentListing[]> {
  const pages = Math.max(1, Math.min(5, params.pages ?? 4));
  const batches = await Promise.all(Array.from({ length: pages }, (_, i) => fetchInvPage(params, i + 1)));
  const seen = new Set<string>();
  const out: InvestmentListing[] = [];
  for (const b of batches) {
    for (const d of b) {
      if (!seen.has(d.id)) { seen.add(d.id); out.push(d); }
    }
  }
  return out;
}
