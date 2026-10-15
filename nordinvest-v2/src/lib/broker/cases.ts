import { etImage } from "@/lib/portals/ejendomstorvet";

/*
 * Finds an agent's investment listing on Ejendomstorvet, by address or by the
 * listing's own link, and returns the numbers the analysis needs: price, the
 * stated yield (net operating income), type and photos.
 */

export type Case = {
  id: string;
  url: string;
  addr: string;
  price: number;
  yieldPct: number;
  subcat: string | null;
  image: string | null;
  agency: string | null;
  agencyUrl: string | null;
};

const SITE = "https://www.ejendomstorvet.dk";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function toCase(r: Record<string, unknown>): Case | null {
  const price = Number(r.sales_price_dkk);
  const yieldPct = Number(r.return_percent);
  if (!(price > 0) || !(yieldPct >= 1 && yieldPct <= 20)) return null;
  const ad = (Array.isArray(r.advertiser_details) ? r.advertiser_details : []) as Record<string, unknown>[];
  const main = ad.find((a) => a.is_primary) ?? ad[0];
  const rel = String(r.listing_url ?? "");
  return {
    id: String(r.id ?? ""),
    url: rel.startsWith("http") ? rel : `${SITE}${rel}`,
    addr: String(r.address ?? "").trim(),
    price,
    yieldPct: Math.round(yieldPct * 100) / 100,
    subcat: (r.subcategory as string | null) ?? null,
    image: etImage(r.image_url),
    agency: main ? String(main.name ?? "") || null : null,
    agencyUrl: main ? String(main.external_listing_url ?? "") || null : null,
  };
}

async function search(q: string): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({ listingTypes: "InvestmentListing", q, sort: "created_desc", page: "1", resultOffset: "0" });
  const r = await fetch(`${SITE}/api/v2/listings/search?${qs}`, { headers: { Accept: "application/json", "User-Agent": UA }, cache: "no-store" }).catch(() => null);
  if (!r?.ok) return [];
  const d = await r.json().catch(() => null);
  return Array.isArray(d?.results) ? d.results : [];
}

const norm = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/**
 * Investment listings matching an address (up to 8). The search is strict
 * about house numbers ("15" does not find "15A-D"), so it also tries the
 * street name alone and keeps listings on that street, the number first.
 * Promoted listings that do not match the street are dropped.
 */
export async function findCases(q: string): Promise<Case[]> {
  const query = q.trim().slice(0, 120);
  if (query.length < 3) return [];
  const street = norm(query.split(",")[0].replace(/\d.*$/, ""));
  const number = query.match(/\d+/)?.[0] ?? null;
  const onStreet = (c: Case) => !street || norm(c.addr).startsWith(street) || norm(c.addr).includes(` ${street}`);
  const seen = new Set<string>();
  const out: Case[] = [];
  const add = (rows: Record<string, unknown>[]) => {
    for (const c of rows.map(toCase)) {
      // The same listing can appear twice (one per advertiser); keep it once.
      const key = c ? `${norm(c.addr)}|${c.price}` : "";
      if (c && c.addr && !seen.has(c.id) && !seen.has(key) && onStreet(c)) { seen.add(c.id); seen.add(key); out.push(c); }
    }
  };
  add(await search(query));
  if (out.length === 0 && street.length >= 3 && street !== norm(query)) add(await search(street));
  if (number) out.sort((a, b) => Number(!new RegExp(`\\b${number}`).test(b.addr)) - Number(!new RegExp(`\\b${number}`).test(a.addr)));
  return out.slice(0, 8);
}

/**
 * The listing behind an Ejendomstorvet link. The address comes from the page;
 * the numbers come from the search, tried from the full address down to the
 * street name. The same listing can carry a second id (one per advertiser),
 * so an exact address match counts when the id is not among the results.
 */
export async function caseFromUrl(url: string): Promise<Case | null> {
  const id = url.match(UUID)?.[0]?.toLowerCase();
  if (!id || !/ejendomstorvet\.dk/i.test(url)) return null;
  const page = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  const title = (page.match(/og:title" content="\s*([^"]+?)\s*"/)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  const addr = title.split(" - ")[0].trim();
  if (!addr) return null;
  const street = addr.split(",")[0].replace(/\d.*$/, "").trim();
  const tries = Array.from(new Set([addr, addr.split(",")[0].trim(), street])).filter((t) => t.length >= 3);
  let sameAddress: Case | null = null;
  for (const t of tries) {
    const rows = await search(t);
    const hit = rows.find((r) => String(r.id).toLowerCase() === id);
    const c = hit ? toCase(hit) : null;
    if (c) return { ...c, url };
    sameAddress ??= rows.map(toCase).find((x) => !!x && norm(x.addr) === norm(addr)) ?? null;
  }
  return sameAddress ? { ...sameAddress, url } : null;
}

/** Up to 8 photos from the listing page, in page order. */
export async function listingPhotos(url: string, fallback: string | null): Promise<string[]> {
  const html = /ejendomstorvet\.dk/i.test(url)
    ? await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" }).then((r) => (r.ok ? r.text() : "")).catch(() => "")
    : "";
  const seen: string[] = [];
  for (const m of Array.from(html.matchAll(/i\.ejendomstorvet\.dk\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}\.jpg/g))) if (!seen.includes(m[0])) seen.push(m[0]);
  const imgs = seen.slice(0, 8).map((u) => `https://${u}?class=listingimagebannermax`);
  return imgs.length ? imgs : fallback ? [fallback] : [];
}
