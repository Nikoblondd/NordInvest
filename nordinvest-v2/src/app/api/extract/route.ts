import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Fields = {
  price?: number;
  area?: number;
  rooms?: number;
  yearBuilt?: number;
  energyLabel?: string;
  monthlyExpenses?: number; // ejerudgift/md
  annualRent?: number;
  monthlyRent?: number;
  yieldPct?: number; // afkast %
  address?: string;
  propertyType?: string;
};

export async function GET(req: NextRequest) {
  // Anonymous analyses are the entire free-tier promise ("3 gratis analyser
  // om måneden — kræver intet kreditkort"). Extract must therefore work
  // without a session. Rate-limit / usage-counting lives on /api/usage.
  const _supabase = createClient();
  void _supabase;

  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }
  let host = "";
  try {
    host = new URL(url).hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/.test(host)) {
      return NextResponse.json({ ok: false, error: "blocked_host" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }

  // Portal-specific fast paths bypass Cloudflare bot-protection by hitting the
  // portal's own public JSON API instead of scraping the SPA shell. Falls back
  // to generic HTML extraction if the API misses.
  if (/(^|\.)boligsiden\.dk$/i.test(host)) {
    const via = await fromBoligsiden(url);
    if (via && via.ok) return NextResponse.json(via);
    // Boligsiden's page shell is Cloudflare-guarded; don't waste a round-trip
    // trying to scrape it after the API missed. Return a clear message so the
    // UI can tell the user the listing isn't active on Boligsiden anymore.
    return NextResponse.json({ ok: false, error: "boligsiden_not_active" });
  }

  let html = "";
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: `fetch_${res.status}` });
    html = await res.text();
  } catch {
    return NextResponse.json({ ok: false, error: "fetch_failed" });
  }

  const f: Fields = {};
  // Source 0: schema.org RealEstateListing (Home, EDC, Danbolig — same shape).
  // Runs before the generic walker so the listing's own address/price/area
  // beat the mægler's postal address / a lot-size floorArea.
  for (const obj of collectJson(html)) mergeFromRealEstateListing(f, obj);
  // Source 1: embedded JSON (JSON-LD, __NEXT_DATA__, __NUXT__, application/json, window.__X=)
  for (const obj of collectJson(html)) mergeFromJson(f, obj);
  // Source 2: OpenGraph + <title>
  f.address ??= metaContent(html, ["og:title"]) ?? titleTag(html) ?? undefined;
  // Source 3: visible-text labelled patterns (fills gaps)
  fromText(f, htmlToText(html));

  // Derive rent from yield if rent missing
  if (!f.annualRent && !f.monthlyRent && f.yieldPct && f.price) {
    f.annualRent = Math.round((f.price * f.yieldPct) / 100);
  }
  if (f.annualRent && !f.monthlyRent) f.monthlyRent = Math.round(f.annualRent / 12);
  if (f.monthlyRent && !f.annualRent) f.annualRent = Math.round(f.monthlyRent * 12);

  const found = Object.entries(f)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k]) => k);

  const images = collectImages(html, url);

  if (!f.price && !f.monthlyRent && !f.area) {
    return NextResponse.json({ ok: false, error: "nothing_found", images });
  }
  return NextResponse.json({ ok: true, fields: f, found, images });
}

/* ---------------- Boligsiden public API ---------------- */
// Boligsiden's page shell is behind a Cloudflare bot check that returns 403
// on plain fetches, so we go through their JSON API instead. The single-case
// endpoint is protected, but /search/cases with a zipCode filter returns full
// case data and stays open. We parse the URL slug, hit the search, and pick
// the case whose house number and floor/side match.

type BsAddress = { street: string; number: string; letter?: string; zip: string; floor?: string; side?: string };

function parseBoligsidenSlug(url: string): BsAddress | null {
  try {
    const u = new URL(url);
    // Path shapes:
    //   /adresse/vesterbrogade-42-2-tv-1620-koebenhavn-v
    //   /adresse/vesterbrogade-42-1620-koebenhavn-v
    //   /bolig/... (some listings)
    const parts = u.pathname.replace(/^\//, "").split("/").filter(Boolean);
    const seg = parts.find((s) => /-\d{4}-/.test(s)) || parts[parts.length - 1];
    if (!seg) return null;
    const tokens = seg.split("-");
    // Find the 4-digit zip
    const zipIdx = tokens.findIndex((t) => /^\d{4}$/.test(t));
    if (zipIdx < 2) return null;
    const zip = tokens[zipIdx];
    // Street + number [+ letter] live before the zip. House number is the
    // first purely-numeric token (with optional letter suffix on the following
    // token like "42-a"). Floor/side may sit between number and zip.
    let numIdx = -1;
    for (let i = 0; i < zipIdx; i++) {
      if (/^\d+[a-z]?$/i.test(tokens[i])) {
        numIdx = i;
        break;
      }
    }
    if (numIdx < 1) return null;
    const street = tokens.slice(0, numIdx).join(" ").replace(/\bkoebenhavn\b/i, "København");
    const numTok = tokens[numIdx];
    const numMatch = numTok.match(/^(\d+)([a-z]?)$/i);
    const number = numMatch?.[1] ?? numTok;
    const letter = numMatch?.[2] || undefined;
    const between = tokens.slice(numIdx + 1, zipIdx);
    const floor = between[0];
    const side = between[1];
    return { street, number, letter, zip, floor, side };
  } catch {
    return null;
  }
}

async function fromBoligsiden(url: string): Promise<{ ok: boolean; fields?: Fields; found?: string[]; images?: string[] } | null> {
  const parsed = parseBoligsidenSlug(url);
  if (!parsed) return null;
  const q = `${parsed.street} ${parsed.number}${parsed.letter ?? ""}`.trim();
  const api = `https://api.boligsiden.dk/search/cases?addressSearch=${encodeURIComponent(q)}&zipCodes=${parsed.zip}&per_page=10`;
  try {
    const res = await fetch(api, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "application/json,*/*;q=0.1",
        "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { cases?: BsCase[] };
    const cases = Array.isArray(j.cases) ? j.cases : [];
    if (cases.length === 0) return null;

    // Pick best match: same house number + letter, and if we know floor/side prefer those.
    const targetNum = parsed.number;
    const targetLetter = (parsed.letter || "").toLowerCase();
    const targetFloor = (parsed.floor || "").toLowerCase();
    const targetSide = (parsed.side || "").toLowerCase();
    const scored = cases
      .map((c) => {
        const a = c.address || {};
        let score = 0;
        if (String(a.houseNumber ?? "") === targetNum) score += 3;
        if (targetLetter && (a.letter || "").toLowerCase() === targetLetter) score += 2;
        if (targetFloor && (a.floor || "").toLowerCase().includes(targetFloor)) score += 1;
        if (targetSide && (a.door || "").toLowerCase().includes(targetSide)) score += 1;
        return { c, score };
      })
      .sort((a, b) => b.score - a.score);

    const winner = scored[0];
    if (!winner || winner.score < 3) return null; // require at least house-number match
    // If the URL specifies a floor or door, require the winning case to match
    // BOTH — otherwise we'd silently swap the user's requested unit for a
    // different apartment at the same street number (e.g. 2.tv → 5.tv).
    const winFloor = (winner.c.address?.floor || "").toLowerCase();
    const winDoor = (winner.c.address?.door || "").toLowerCase();
    if (targetFloor && !winFloor.includes(targetFloor) && !targetFloor.includes(winFloor)) return null;
    if (targetSide && !winDoor.includes(targetSide) && !targetSide.includes(winDoor)) return null;
    const c = winner.c;
    const a = c.address || {};

    const f: Fields = {};
    if (typeof c.priceCash === "number" && c.priceCash > 100000) f.price = c.priceCash;
    if (typeof c.housingArea === "number" && c.housingArea >= 10) f.area = c.housingArea;
    if (typeof c.numberOfRooms === "number" && c.numberOfRooms > 0) f.rooms = c.numberOfRooms;
    if (typeof c.yearBuilt === "number" && c.yearBuilt > 1700) f.yearBuilt = c.yearBuilt;
    if (c.energyLabel && /^[A-G]\d?$/i.test(c.energyLabel)) f.energyLabel = c.energyLabel.toUpperCase();
    if (typeof c.monthlyExpense === "number" && c.monthlyExpense > 0) f.monthlyExpenses = c.monthlyExpense;
    if (c.addressType) f.propertyType = c.addressType;
    const parts = [
      a.roadName,
      [a.houseNumber, a.letter].filter(Boolean).join(""),
      [a.floor, a.door].filter(Boolean).join("."),
    ].filter(Boolean);
    const cityParts = [a.zipCode, a.cityName].filter(Boolean).join(" ");
    const addr = [parts.join(" "), cityParts].filter(Boolean).join(", ");
    if (addr) f.address = addr.slice(0, 120);

    const images: string[] = [];
    if (c.defaultImage?.url) images.push(c.defaultImage.url);
    for (const img of c.images ?? []) if (img.url) images.push(img.url);

    const found = Object.entries(f)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k]) => k);

    if (!f.price && !f.area) return null;
    return { ok: true, fields: f, found, images: images.slice(0, 8) };
  } catch {
    return null;
  }
}

type BsCase = {
  priceCash?: number;
  housingArea?: number;
  numberOfRooms?: number;
  yearBuilt?: number;
  energyLabel?: string;
  monthlyExpense?: number;
  addressType?: string;
  defaultImage?: { url?: string };
  images?: { url?: string }[];
  address?: {
    roadName?: string;
    houseNumber?: string | number;
    letter?: string;
    floor?: string;
    door?: string;
    zipCode?: string | number;
    cityName?: string;
  };
};

/* ---------------- listing photos (for AI condition analysis) ---------------- */

function collectImages(html: string, pageUrl: string): string[] {
  const urls = new Set<string>();
  // OpenGraph / twitter hero images first (most reliable, publicly fetchable).
  for (const re of [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi,
  ]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) urls.add(m[1]);
  }
  // Then any image-file URLs in the markup / embedded JSON.
  const re = /https?:\\?\/\\?\/[^"'\s<>()]+?\.(?:jpe?g|webp|png)(?:\?[^"'\s<>]*)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && urls.size < 40) urls.add(m[0].replace(/\\\//g, "/"));

  const bad = /(logo|icon|sprite|favicon|avatar|placeholder|badge|pixel|1x1|blank|map|flag)/i;
  const base = (() => { try { return new URL(pageUrl).origin; } catch { return ""; } })();

  return Array.from(urls)
    .map((u) => decode(u).trim())
    .map((u) => (u.startsWith("//") ? "https:" + u : u.startsWith("/") ? base + u : u))
    .filter((u) => /^https?:\/\//.test(u) && !bad.test(u))
    .slice(0, 8);
}

/* ---------------- JSON sources ---------------- */

function collectJson(html: string): unknown[] {
  const out: unknown[] = [];
  const patterns = [
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi,
    /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html))) {
      try {
        out.push(JSON.parse(m[1].trim()));
      } catch {
        /* ignore */
      }
    }
  }
  // window.__NUXT__ = {...} / __INITIAL_STATE__ = {...}
  const win = /(?:__NUXT__|__INITIAL_STATE__|__APOLLO_STATE__)\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/gi;
  let w;
  while ((w = win.exec(html))) {
    try {
      out.push(JSON.parse(w[1]));
    } catch {
      /* ignore */
    }
  }
  return out;
}

const K = {
  price: ["price", "kontantpris", "cashprice", "salesprice", "askingprice", "pricevalue", "udbudspris", "salgspris"],
  area: ["area", "boligareal", "livingarea", "floorsize", "size", "areal", "m2", "squaremeters", "value"],
  rooms: ["rooms", "numberofrooms", "roomcount", "vaerelser", "antalvaerelser", "rum"],
  year: ["yearbuilt", "buildyear", "byggeaar", "byggear", "constructionyear", "opfoert", "opfort"],
  energy: ["energylabel", "energimaerke", "energimarke", "energyclass", "energymark", "energilabel"],
  expense: ["ownerexpense", "ejerudgift", "monthlyexpense", "ownercost", "udgift"],
  rent: ["annualrent", "yearlyrent", "rentalincome", "lejeindtaegt", "lejeindtaegtaar", "aarligleje", "rent", "leje", "husleje"],
  yield: ["yield", "afkast", "returnrate", "startyield", "startafkast", "forrentning"],
};

function norm(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/* ---------------- schema.org RealEstateListing fast path ---------------- */
// Home, EDC, Danbolig, and most portal-in-a-box builds emit the same nested
// shape: RealEstateListing.offers.price + RealEstateListing.itemOffered
// (House/Apartment/Residence) with address, floorSize, numberOfRooms,
// yearBuilt, additionalProperty[]. Pulling from THAT tree (not the mægler
// PostalAddress or a plot-area value) gives us the right listing every time.

type SchemaNode = Record<string, unknown> & { "@type"?: string | string[] };

function typeOf(n: unknown): string[] {
  if (!n || typeof n !== "object") return [];
  const t = (n as SchemaNode)["@type"];
  return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
}
function hasType(n: unknown, ...names: string[]): boolean {
  const ts = typeOf(n);
  return ts.some((t) => names.includes(t));
}

function findFirst<T = unknown>(root: unknown, match: (n: unknown) => boolean): T | null {
  const seen = new Set<unknown>();
  const stack: unknown[] = [root];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n !== "object" || seen.has(n)) continue;
    seen.add(n);
    if (match(n)) return n as T;
    if (Array.isArray(n)) stack.push(...n);
    else stack.push(...Object.values(n as Record<string, unknown>));
  }
  return null;
}

function quantity(n: unknown): number | null {
  if (n == null) return null;
  if (typeof n === "number") return isFinite(n) ? n : null;
  if (typeof n === "string") return daNum(n);
  if (typeof n === "object") {
    const v = (n as SchemaNode).value ?? (n as SchemaNode)["@value"];
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string") return daNum(v);
  }
  return null;
}

function streetAddressOf(node: unknown): string | null {
  if (!node) return null;
  if (typeof node === "string") return node.length > 3 ? node : null;
  if (typeof node !== "object") return null;
  const a = node as Record<string, unknown>;
  const s = a.streetAddress;
  if (typeof s === "string" && s.length > 3) {
    const loc = typeof a.addressLocality === "string" ? a.addressLocality : "";
    const zip = typeof a.postalCode === "string" ? a.postalCode : "";
    // Some feeds already include zip + city in streetAddress; don't double it up.
    if (/\d{4}/.test(s)) return s;
    const tail = [zip, loc].filter(Boolean).join(" ");
    return tail ? `${s}, ${tail}` : s;
  }
  return null;
}

function mergeFromRealEstateListing(f: Fields, root: unknown): void {
  const listing = findFirst(root, (n) => {
    if (!hasType(n, "RealEstateListing", "Product")) return false;
    const s = n as SchemaNode;
    return Boolean(s.offers || s.itemOffered || s.mainEntity);
  });
  if (!listing) return;
  const L = listing as SchemaNode;
  // Price — offers can be an object or an array of offers. Some portals
  // (Nybolig) emit the field with a capitalised "Price" instead of the
  // schema.org-canonical "price", so read both.
  const offers = Array.isArray(L.offers) ? L.offers : L.offers ? [L.offers] : [];
  for (const o of offers) {
    const oo = o as SchemaNode;
    const price = quantity(oo?.price ?? (oo as Record<string, unknown>)?.Price);
    // Guard: Nybolig also lists RENTALS under /ejerlejlighed/, where the
    // Price field holds a monthly rent (~kr 5.000-30.000). Only accept as
    // sale price when it's above 100 k.
    if (price && price > 100000 && !f.price) f.price = price;
  }
  // itemOffered lives EITHER on the RealEstateListing itself (schema.org
  // canonical), OR nested inside offers (Home.dk), OR at mainEntity (Nybolig).
  // Try each in turn, then fall back to reading from the listing node itself.
  const item =
    (L.itemOffered as SchemaNode | undefined) ??
    (offers
      .map((o) => (o as SchemaNode)?.itemOffered as SchemaNode | undefined)
      .find(Boolean)) ??
    (L.mainEntity as SchemaNode | undefined);
  const container: SchemaNode = item ?? L;
  // Address — prefer itemOffered.address, not the mægler's postal address.
  if (!f.address) {
    const addr = streetAddressOf((container as SchemaNode).address ?? (container as SchemaNode).location);
    if (addr) f.address = addr.slice(0, 120);
  }
  // Living area — accommodationFloorPlan.floorSize.value is the reliable one;
  // fall back to floorSize on the accommodation itself.
  if (!f.area) {
    const plan = (container as SchemaNode).accommodationFloorPlan as SchemaNode | undefined;
    const fs = plan?.floorSize ?? (container as SchemaNode).floorSize;
    const v = quantity(fs);
    if (v && v >= 10 && v <= 5000) f.area = v;
  }
  const rooms = quantity((container as SchemaNode).numberOfRooms);
  if (rooms && rooms > 0 && rooms < 50 && !f.rooms) f.rooms = Math.round(rooms);
  const yb = quantity((container as SchemaNode).yearBuilt);
  if (yb && yb >= 1700 && yb <= 2100 && !f.yearBuilt) f.yearBuilt = Math.round(yb);
  // Energy rating rides on additionalProperty[]{name:"EnergyRating"|"Energy label", value:"C"}
  if (!f.energyLabel) {
    const props = (container as SchemaNode).additionalProperty as unknown[] | undefined;
    if (Array.isArray(props)) {
      for (const p of props) {
        const pn = p as SchemaNode;
        const nm = String(pn.name ?? "").toLowerCase();
        if (/energ/.test(nm)) {
          const val = String(pn.value ?? "").trim().toUpperCase();
          if (/^[A-G]\d?$/.test(val)) { f.energyLabel = val; break; }
        }
      }
    }
  }
}

function mergeFromJson(f: Fields, root: unknown) {
  const seen = new Set<unknown>();
  const walk = (node: unknown, keyHint = "") => {
    if (node == null || seen.has(node)) return;
    if (typeof node === "object") {
      seen.add(node);
      if (Array.isArray(node)) {
        node.forEach((v) => walk(v, keyHint));
        return;
      }
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        const nk = norm(k);
        if (typeof v === "number" || typeof v === "string") {
          const n = toNum(v);
          if (n != null) {
            if (K.price.includes(nk) && n > 100000 && !f.price) f.price = n;
            else if (K.area.includes(nk) && n >= 10 && n <= 5000 && nk !== "value" && !f.area) f.area = n;
            else if (K.rooms.includes(nk) && n >= 1 && n <= 30 && !f.rooms) f.rooms = n;
            else if (K.year.includes(nk) && n >= 1700 && n <= 2100 && !f.yearBuilt) f.yearBuilt = n;
            else if (K.expense.includes(nk) && n > 100 && n < 60000 && !f.monthlyExpenses) f.monthlyExpenses = n;
            else if (K.rent.includes(nk) && n > 1000 && !f.annualRent && !f.monthlyRent) {
              if (n > 60000) f.annualRent = n;
              else f.monthlyRent = n;
            } else if (K.yield.includes(nk) && n > 0 && n < 25 && !f.yieldPct) f.yieldPct = n;
          }
          if (typeof v === "string") {
            if (K.energy.includes(nk) && /^[A-G]\d?$/i.test(v.trim()) && !f.energyLabel) f.energyLabel = v.trim().toUpperCase();
            if ((nk === "streetaddress" || nk === "adresse" || nk === "address") && v.length > 4 && !f.address) f.address = v.slice(0, 120);
          }
        } else {
          walk(v, nk);
        }
      }
    }
  };
  walk(root);
}

function toNum(v: unknown): number | null {
  if (typeof v === "number") return isFinite(v) ? v : null;
  if (typeof v === "string") return daNum(v);
  return null;
}

// Danish number parsing: "2.495.000" -> 2495000 ; "4,5" -> 4.5 ; "1.234,56" -> 1234.56
function daNum(s: string): number | null {
  const cleaned = s.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  let x = cleaned;
  if (x.includes(".") && x.includes(",")) x = x.replace(/\./g, "").replace(",", ".");
  else if (x.includes(",")) x = x.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(x)) x = x.replace(/\./g, "");
  const n = Number(x);
  return isFinite(n) ? n : null;
}

/* ---------------- OG / title ---------------- */

function metaContent(html: string, props: string[]): string | null {
  for (const p of props) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)["']`, "i");
    const m = html.match(re);
    if (m) return decode(m[1]).slice(0, 120);
  }
  return null;
}
function titleTag(html: string): string | null {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? decode(m[1]).slice(0, 120) : null;
}

/* ---------------- Visible text ---------------- */

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function labelled(text: string, labels: string[], unit: "kr" | "pct" | "m2" | "year" | "none"): number | null {
  for (const lbl of labels) {
    // label followed (within ~40 chars) by a number
    const re = new RegExp(`${lbl}[^\\d]{0,40}?(\\d[\\d.,\\s]*)\\s*(?:kr|%|m²|m2|dkk)?`, "i");
    const m = text.match(re);
    if (m) {
      const n = daNum(m[1]);
      if (n == null) continue;
      if (unit === "year" && (n < 1700 || n > 2100)) continue;
      if (unit === "m2" && (n < 10 || n > 5000)) continue;
      if (unit === "pct" && (n <= 0 || n > 25)) continue;
      return n;
    }
  }
  return null;
}

function fromText(f: Fields, text: string) {
  f.price ??= labelled(text, ["kontantpris", "udbudspris", "pris"], "kr") ?? undefined;
  if (f.price && f.price < 100000) f.price = undefined; // guard against picking a small number
  f.area ??= labelled(text, ["boligareal", "bolig", "areal"], "m2") ?? undefined;
  f.rooms ??= labelled(text, ["værelser", "vaerelser", "rum"], "none") ?? undefined;
  f.yearBuilt ??= labelled(text, ["byggeår", "byggeaar", "opført", "opfoert"], "year") ?? undefined;
  f.monthlyExpenses ??= labelled(text, ["ejerudgift pr", "ejerudgift", "ejerudgifter"], "kr") ?? undefined;
  if (!f.annualRent && !f.monthlyRent) {
    const yr = labelled(text, ["årlig lejeindtægt", "aarlig lejeindtaegt", "lejeindtægt pr. år", "lejeindtægt", "lejeindtaegt", "årlig leje"], "kr");
    if (yr && yr > 60000) f.annualRent = yr;
    const mr = labelled(text, ["husleje pr", "månedlig leje", "maanedlig leje", "husleje"], "kr");
    if (mr && mr < 60000 && mr > 1000) f.monthlyRent = mr;
  }
  f.yieldPct ??= labelled(text, ["startafkast", "afkast", "forrentning"], "pct") ?? undefined;
  if (!f.energyLabel) {
    const m = text.match(/energim[æa]rke[^A-G]{0,12}([A-G])\b/i);
    if (m) f.energyLabel = m[1].toUpperCase();
  }
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .trim();
}
