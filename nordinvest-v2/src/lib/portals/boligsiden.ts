// Boligsiden search adapter. Boligsiden aggregates the whole Danish residential
// market — a single query returns listings from EDC, Home, Nybolig, Danbolig,
// Realmæglerne and dozens more, each with a deep link to the agent's own page.
// Clean JSON, no auth. We normalise it into our `DealListing` shape.

import type { DealListing } from "@/lib/deals";

const BASE = "https://api.boligsiden.dk/search/cases";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

export type BoligsidenParams = {
  addressTypes?: string; // condo | villa | terraced | cooperative
  municipalities?: string; // slug, e.g. "koebenhavn"
  zipCodes?: string; // comma-separated
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  pages?: number;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function host(url: string | null | undefined): string {
  if (!url) return "boligsiden.dk";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "boligsiden.dk";
  }
}

// Boligsiden ships several sizes (100×80 thumb → 1440×960). Pick a crisp
// card-sized one — the largest that isn't oversized — never the tiny thumbnail.
function pickSource(sources: any): string | null {
  if (!Array.isArray(sources)) return null;
  const withW = sources
    .filter((s) => s?.url && s?.size?.width)
    .sort((a, b) => a.size.width - b.size.width);
  if (withW.length === 0) return sources.find((s: any) => s?.url)?.url ?? null;
  const good = [...withW].reverse().find((s) => s.size.width <= 900); // largest ≤ 900
  return (good ?? withW[withW.length - 1]).url as string;
}

function firstImage(c: any): string | null {
  const fromDefault = pickSource(c?.defaultImage?.imageSources);
  if (fromDefault) return fromDefault;
  const imgs = c?.images;
  if (Array.isArray(imgs)) return pickSource(imgs[0]?.imageSources);
  return null;
}

function mapCase(c: any): DealListing | null {
  const a = c?.address ?? {};
  const price = Number(c?.priceCash);
  if (!Number.isFinite(price) || price <= 0) return null;
  const road = [a.roadName, a.houseNumber].filter(Boolean).join(" ");
  const floorDoor = [a.floor && a.floor !== "0" ? `${a.floor}.` : null, a.door].filter(Boolean).join(" ");
  const address = [road + (floorDoor ? ` ${floorDoor}` : ""), `${a.zipCode ?? ""} ${a.cityName ?? ""}`.trim()]
    .filter(Boolean)
    .join(", ");
  return {
    id: String(c?.caseID ?? c?.slug ?? `${road}-${price}`),
    source: host(c?.caseUrl),
    url: c?.caseUrl ?? "",
    image: firstImage(c),
    address,
    road,
    zip: Number(a.zipCode) || 0,
    city: a.cityName ?? "",
    price,
    monthlyExpense: Number.isFinite(Number(c?.monthlyExpense)) ? Number(c.monthlyExpense) : null,
    area: Number.isFinite(Number(c?.housingArea)) ? Number(c.housingArea) : null,
    rooms: Number.isFinite(Number(c?.numberOfRooms)) ? Number(c.numberOfRooms) : null,
    yearBuilt: Number.isFinite(Number(c?.yearBuilt)) ? Number(c.yearBuilt) : null,
    energyLabel: typeof c?.energyLabel === "string" ? c.energyLabel.toUpperCase() : null,
    priceChangePct: Number.isFinite(Number(c?.priceChangePercentage)) ? Number(c.priceChangePercentage) : null,
    daysOnMarket: Number.isFinite(Number(c?.daysOnMarket)) ? Number(c.daysOnMarket) : null,
    type: c?.addressType ?? "condo",
    bfe: Array.isArray(a?.bfeNumbers) && a.bfeNumbers.length ? Number(a.bfeNumbers[0]) : null,
    lat: c?.coordinates?.lat ?? null,
    lon: c?.coordinates?.lon ?? null,
  };
}

async function fetchPage(params: BoligsidenParams, page: number): Promise<DealListing[]> {
  const q = new URLSearchParams();
  q.set("addressTypes", params.addressTypes ?? "condo");
  if (params.municipalities) q.set("municipalities", params.municipalities);
  if (params.zipCodes) q.set("zipCodes", params.zipCodes);
  // These portal filters DO work (priceMin/priceMax/areaMin); we still re-filter
  // in our own code so results are always exact regardless of the portal.
  if (params.priceMin) q.set("priceMin", String(params.priceMin));
  if (params.priceMax) q.set("priceMax", String(params.priceMax));
  if (params.areaMin) q.set("areaMin", String(params.areaMin));
  q.set("perPage", "50");
  q.set("page", String(page));
  try {
    const res = await fetch(`${BASE}?${q.toString()}`, {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const cases = Array.isArray(data?.cases) ? data.cases : [];
    return cases.map(mapCase).filter((x: DealListing | null): x is DealListing => x !== null);
  } catch {
    return [];
  }
}

export async function searchBoligsiden(params: BoligsidenParams): Promise<DealListing[]> {
  // Pull several pages in parallel for a deep, current pool — so filtering and
  // ranking have real depth and the results reflect the live market, not a
  // fixed first page.
  const pages = Math.max(1, Math.min(4, params.pages ?? 3));
  const batches = await Promise.all(Array.from({ length: pages }, (_, i) => fetchPage(params, i + 1)));
  const seen = new Set<string>();
  const out: DealListing[] = [];
  for (const b of batches) {
    for (const d of b) {
      if (!seen.has(d.id)) { seen.add(d.id); out.push(d); }
    }
  }
  return out;
}
