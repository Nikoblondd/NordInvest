import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gateApi } from "@/lib/gate";

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
  bfe?: number; // Bestemt Fast Ejendom, from Boligsiden; keys VUR and EJF
  lotArea?: number; // grundareal, m²
};

export async function GET(req: NextRequest) {
  const denied = await gateApi(req);
  if (denied) return denied;
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
    if (via && via.ok) {
      // Boligsiden's search API only returns ~5 photos per case. Enrich the
      // gallery by ALSO fetching the mægler page (Home/EDC/Danbolig/Nybolig
      // etc.) in parallel and merging its image set with what BS gave us —
      // typical result: 15-30 photos instead of 5. Doesn't block on failure.
      if (via.followUrl) {
        try {
          const followed = await extractFromMaeglerUrl(via.followUrl);
          if (followed.ok && followed.images && followed.images.length) {
            const seen = new Set<string>();
            const merged: string[] = [];
            for (const u of [...(via.images ?? []), ...followed.images]) {
              if (!seen.has(u)) { seen.add(u); merged.push(u); }
              if (merged.length >= 30) break;
            }
            return NextResponse.json({ ...via, images: merged });
          }
        } catch {
          /* mægler enrichment is best-effort */
        }
      }
      return NextResponse.json(via);
    }
    // If Boligsiden's API didn't have this listing but we got a mægler URL out
    // of the case data, fetch that page instead. The mæglers (Home, EDC, Estate,
    // Danbolig, Nybolig) all return real HTML for us.
    if (via && via.followUrl) {
      const followed = await extractFromMaeglerUrl(via.followUrl);
      if (followed.ok) return NextResponse.json(followed);
    }
    // Last fallback: hand the parsed address back so the analyzer can still
    // prefill the address field, trigger BBR enrichment, and let the user
    // type the numbers themselves — always better than an empty state.
    if (via && via.fallbackAddress) {
      return NextResponse.json({
        ok: true,
        fields: { address: via.fallbackAddress },
        found: ["address"],
        images: [],
        partial: true,
        source: "boligsiden_slug",
      });
    }
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
  fillGaps(f, html);

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

  // Broker pages often leave gaps (no area, a brand name in the title, a
  // headline instead of an address). Look the same case up on Boligsiden by
  // its address, or by the address in the link itself, and fill the gaps.
  if (typeof f.address === "string") f.address = cleanAddress(f.address);
  if (!f.price) delete f.price; // "0" from a label is not a price
  const looksLikeAddress = typeof f.address === "string" && /\d/.test(f.address) && /\b\d{4}\b/.test(f.address);
  if (!f.price || !f.area || !f.bfe || !looksLikeAddress) {
    const slug = (looksLikeAddress ? addressSlug(String(f.address)) : null) ?? slugFromUrl(url);
    if (slug) {
      const bs = await fromBoligsiden(`https://www.boligsiden.dk/adresse/${slug}`).catch(() => null);
      if (bs?.ok && bs.fields) {
        const b = bs.fields;
        // Boligsiden's register-backed facts win; the broker's price and costs stay.
        const trust = new Set(["area", "address", "bfe", "lotArea", "yearBuilt", "rooms"]);
        for (const [k, v] of Object.entries(b)) {
          const cur = (f as Record<string, unknown>)[k];
          if (v != null && v !== "" && (trust.has(k) || cur == null || cur === "" || cur === 0)) (f as Record<string, unknown>)[k] = v;
        }
      }
    }
  }
  const foundAll = Object.entries(f).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== 0).map(([k]) => k);

  if (!f.price && !f.monthlyRent && !f.area) {
    return NextResponse.json({ ok: false, error: "nothing_found", images });
  }
  void found;
  return NextResponse.json({ ok: true, fields: f, found: foundAll, images });
}

/** Strip a brand suffix ("… | LILIENHOFF", "… - Investering") and empty parts. */
function cleanAddress(a: string): string {
  return a
    .split(/\s+[|–]\s+/)[0]
    .replace(/\s+-\s+[^,\d]*$/, "")
    .replace(/(,\s*)+,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** "Farvervej 2, 1. th, 8800 Viborg" → "farvervej-2-1-th-8800-viborg" (the Boligsiden slug shape). */
function addressSlug(a: string): string | null {
  const m = a.match(/^\s*([^,\d]+?)\s+(\d+\s?[A-Za-z]?)\b(.*?)\b(\d{4})\b\s*([^,|]*)/);
  if (!m) return null;
  const [, street, num, middle, zip, city] = m;
  const floor = floorPart(middle.replace(/[,.]/g, " "));
  const parts = [slugifyRoadName(street), slugifyRoadName(num.replace(/\s/g, "")), floor && slugifyRoadName(floor), zip, slugifyRoadName(city.trim())].filter(Boolean);
  return parts.join("-").replace(/-+/g, "-");
}

/** The floor and side of an address ("1. th", "st tv"), as Boligsiden slug tokens. */
function floorPart(s: string): string {
  const t = s.trim().split(/\s+/).filter(Boolean);
  const floor = t.find((x) => /^(st|kl|\d{1,2})$/i.test(x));
  const side = t.find((x) => /^(th|tv|mf)$/i.test(x));
  return [floor, side].filter(Boolean).join("-").toLowerCase();
}

/** A broker link that carries the address itself, e.g. /sag/123/abkaervej-36-over-jerstal-6500-vojens/. */
function slugFromUrl(url: string): string | null {
  try {
    const seg = new URL(url).pathname.split("/").filter(Boolean).find((x) => /^[a-z0-9æøå-]+-\d+[a-z]?(-[a-z0-9æøå]+)*-\d{4}-[a-z]/i.test(x));
    if (!seg) return null;
    // Keep street, number, floor/side and zip + city; drop a village name
    // written between the number and the zip ("abkaervej-36-over-jerstal-6500-vojens").
    const t = slugifyRoadName(decodeURIComponent(seg)).split("-");
    const zi = t.findIndex((x, i) => /^\d{4}$/.test(x) && t.slice(i + 1).every((y) => !/^\d+$/.test(y)));
    const ni = t.findIndex((x) => /^\d+[a-z]?$/.test(x));
    if (zi < 0 || ni < 1 || ni > zi) return null;
    const mid = floorPart(t.slice(ni + 1, zi).join(" "));
    return [...t.slice(0, ni + 1), ...(mid ? [mid] : []), ...t.slice(zi)].join("-");
  } catch {
    return null;
  }
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
    // The postnummer is the last 4-digit token, followed only by the city
    // name. A door number can also be four digits ("vestervang-41-4-4145-
    // 8000-aarhus-c"), so the first one is not enough.
    let zipIdx = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (/^\d{4}$/.test(tokens[i]) && tokens.slice(i + 1).every((t) => !/^\d+$/.test(t))) { zipIdx = i; break; }
    }
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

// Slugify a Boligsiden roadName so it compares apples-to-apples with the tokens
// we pulled from the URL slug (aa/oe/ae, no punctuation, spaces → hyphens).
function slugifyRoadName(name: string): string {
  return name
    .toLowerCase()
    .replace(/å/g, "aa")
    .replace(/ø/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

type BsResult = {
  ok: boolean;
  fields?: Fields;
  found?: string[];
  images?: string[];
  followUrl?: string; // mægler URL to fall through to if API had no rich data
  fallbackAddress?: string; // parsed address string when nothing else works
};

async function fromBoligsiden(url: string): Promise<BsResult | null> {
  const parsed = parseBoligsidenSlug(url);
  if (!parsed) return null;

  // Always produce a fallback address from the slug so even a total miss lets
  // the analyzer prefill the address for BBR and let the user type the rest.
  const streetPretty = parsed.street
    .replace(/\bkoebenhavn\b/i, "København")
    .replace(/\baabenraa\b/i, "Aabenraa")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  const fallbackAddress = `${streetPretty} ${parsed.number}${parsed.letter ?? ""}, ${parsed.zip}`;

  const api = `https://api.boligsiden.dk/search/cases?zipCodes=${parsed.zip}&per_page=200`;
  let cases: BsCase[] = [];
  try {
    const res = await fetch(api, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "application/json,*/*;q=0.1",
        "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
      },
    });
    if (res.ok) {
      const j = (await res.json()) as { cases?: BsCase[] };
      cases = Array.isArray(j.cases) ? j.cases : [];
    }
  } catch {
    /* fall through to fallback */
  }

  if (cases.length === 0) return { ok: false, fallbackAddress };

  // Local match — the API's addressSearch parameter is ignored by the backend,
  // so filter every case at that zip against the slug ourselves.
  const targetStreetSlug = parsed.street.replace(/\s+/g, "-");
  const targetNum = parsed.number;
  const targetLetter = (parsed.letter || "").toLowerCase();
  const targetFloor = (parsed.floor || "").toLowerCase();
  const targetSide = (parsed.side || "").toLowerCase();

  const roadMatches = cases.filter((c) => {
    const rn = c.address?.roadName;
    if (!rn) return false;
    const s = slugifyRoadName(rn);
    return s === targetStreetSlug || s.startsWith(targetStreetSlug) || targetStreetSlug.startsWith(s);
  });

  // Street matches but nothing on that houseNumber? Try to find EXACT unit.
  const numMatches = roadMatches.filter(
    (c) => String(c.address?.houseNumber ?? "") === targetNum,
  );
  const withLetter = targetLetter
    ? numMatches.filter((c) => (c.address?.letter || "").toLowerCase() === targetLetter)
    : numMatches;
  const withFloor = targetFloor
    ? withLetter.filter((c) => {
        const fl = (c.address?.floor || "").toLowerCase();
        return fl === targetFloor || fl.includes(targetFloor) || targetFloor.includes(fl);
      })
    : withLetter;
  const withDoor = targetSide
    ? withFloor.filter((c) => {
        const dr = (c.address?.door || "").toLowerCase();
        return dr === targetSide || dr.includes(targetSide) || targetSide.includes(dr);
      })
    : withFloor;

  // Strict matching: if the URL specifies a floor/side, the winning case MUST
  // match — otherwise we'd swap the user's requested unit (2.tv) for a different
  // one on the same street (5.tv). Fall back to the address-only path instead
  // of silently returning the wrong apartment's numbers.
  // Best of all: Boligsiden's own slug for the listing, exactly as in the URL.
  const urlSlug = (() => { try { return new URL(url).pathname.split("/").filter(Boolean).pop()?.toLowerCase() ?? ""; } catch { return ""; } })();
  const exact = cases.find((c) => typeof (c as { slugAddress?: string }).slugAddress === "string" && (c as { slugAddress?: string }).slugAddress!.toLowerCase() === urlSlug);

  let winner: BsCase | undefined = exact;
  if (winner) {
    // found by slug
  } else if (targetFloor && targetSide) {
    winner = withDoor[0];
  } else if (targetFloor) {
    winner = withFloor[0];
  } else if (targetLetter) {
    winner = withLetter[0];
  } else {
    // No floor/door in the URL means the URL points to a whole-property record
    // (villa, terraced house, single-address condo). Any case at that number is fine.
    winner = numMatches[0];
  }
  if (!winner) {
    // The exact unit isn't actively listed on Boligsiden. Don't invent numbers.
    return { ok: false, fallbackAddress };
  }

  const c = winner;
  const a = c.address || {};
  const f: Fields = {};
  if (typeof c.priceCash === "number" && c.priceCash > 100000) f.price = c.priceCash;
  if (typeof c.housingArea === "number" && c.housingArea >= 10) f.area = c.housingArea;
  if (typeof c.numberOfRooms === "number" && c.numberOfRooms > 0) f.rooms = c.numberOfRooms;
  if (typeof c.yearBuilt === "number" && c.yearBuilt > 1700) f.yearBuilt = c.yearBuilt;
  if (c.energyLabel && /^[A-G]\d?$/i.test(c.energyLabel)) f.energyLabel = c.energyLabel.toUpperCase();
  if (typeof c.monthlyExpense === "number" && c.monthlyExpense > 0) f.monthlyExpenses = c.monthlyExpense;
  if (c.addressType) f.propertyType = c.addressType;
  if (Array.isArray(c.address?.bfeNumbers) && c.address!.bfeNumbers!.length === 1) f.bfe = Number(c.address!.bfeNumbers![0]);
  if (typeof c.lotArea === "number" && c.lotArea > 0) f.lotArea = c.lotArea;
  const parts = [
    a.roadName,
    [a.houseNumber, a.letter].filter(Boolean).join(""),
    [a.floor, a.door].filter(Boolean).join("."),
  ].filter(Boolean);
  const cityParts = [a.zipCode, a.cityName].filter(Boolean).join(" ");
  const addr = [parts.join(" "), cityParts].filter(Boolean).join(", ");
  if (addr) f.address = addr.slice(0, 120);

  // Boligsiden emits each image as an `imageSources[]` array with 5-6 size
  // variants; pull the largest for each unique photo, dedupe, then also
  // pass caseUrl as `followUrl` so the mægler HTML can add more photos to
  // the set (Boligsiden's search API only returns 5 photos per case; the
  // mægler site typically has 15-30).
  const imgSeen = Object.create(null) as Record<string, true>;
  const images: string[] = [];
  const pushImg = (u: string | null) => {
    if (u && !imgSeen[u]) { imgSeen[u] = true; images.push(u); }
  };
  pushImg(largestImageUrl(c.defaultImage));
  for (const img of c.images ?? []) pushImg(largestImageUrl(img));

  const found = Object.entries(f)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k]) => k);

  if (f.price || f.area) {
    return {
      ok: true,
      fields: f,
      found,
      images: images.slice(0, 30),
      // Pass mægler URL along so the caller can merge in more photos.
      followUrl: c.caseUrl,
    };
  }

  // We have a matched case but no price/area (data-sparse case). Try the
  // mægler URL as a fallthrough — Estate, Home, Nybolig all return the JSON-LD
  // we can parse. The fallback address is still returned so the caller keeps
  // context if the mægler fetch also fails.
  return {
    ok: false,
    followUrl: c.caseUrl,
    fallbackAddress: f.address ?? fallbackAddress,
  };
}

// Fetch the mægler's own page (Home, EDC, Estate, Nybolig, Danbolig) and run
// the same JSON-LD path we already use for direct portal URLs. Follows the
// short redirects those portals emit for case IDs.
async function extractFromMaeglerUrl(mUrl: string): Promise<{ ok: boolean; fields?: Fields; found?: string[]; images?: string[] }> {
  try {
    const res = await fetch(mUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) return { ok: false };
    const html = await res.text();
    const f: Fields = {};
    for (const obj of collectJson(html)) mergeFromRealEstateListing(f, obj);
    for (const obj of collectJson(html)) mergeFromJson(f, obj);
    f.address ??= metaContent(html, ["og:title"]) ?? titleTag(html) ?? undefined;
    fromText(f, htmlToText(html));
    fillGaps(f, html);
    if (f.annualRent && !f.monthlyRent) f.monthlyRent = Math.round(f.annualRent / 12);
    if (f.monthlyRent && !f.annualRent) f.annualRent = Math.round(f.monthlyRent * 12);
    const found = Object.entries(f)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k]) => k);
    const images = collectImages(html, mUrl);
    if (!f.price && !f.monthlyRent && !f.area) return { ok: false };
    return { ok: true, fields: f, found, images };
  } catch {
    return { ok: false };
  }
}

type BsImageSource = { url?: string; size?: { width?: number; height?: number } };
type BsImageObj = { url?: string; imageSources?: BsImageSource[] };

/** Pick the largest URL out of a Boligsiden image object's imageSources array. */
function largestImageUrl(img: BsImageObj | undefined): string | null {
  if (!img) return null;
  const sources = img.imageSources ?? [];
  let best = "";
  let bestPx = 0;
  for (const s of sources) {
    if (!s.url) continue;
    const px = (s.size?.width ?? 0) * (s.size?.height ?? 0);
    if (px > bestPx) { best = s.url; bestPx = px; }
  }
  return best || img.url || null;
}

type BsCase = {
  priceCash?: number;
  housingArea?: number;
  numberOfRooms?: number;
  yearBuilt?: number;
  energyLabel?: string;
  monthlyExpense?: number;
  addressType?: string;
  lotArea?: number;
  caseUrl?: string;
  defaultImage?: BsImageObj;
  images?: BsImageObj[];
  address?: {
    roadName?: string;
    houseNumber?: string | number;
    letter?: string;
    floor?: string;
    door?: string;
    zipCode?: string | number;
    cityName?: string;
    bfeNumbers?: number[];
  };
};

/* ---------------- listing photos (for AI condition analysis) ---------------- */

function collectImages(html: string, pageUrl: string): string[] {
  // Plain-array accumulator + a seen-map to dedupe; avoids iterating a Set
  // (which the project's tsc target doesn't allow spreading without a flag).
  const seenRaw = Object.create(null) as Record<string, true>;
  const raws: string[] = [];
  const add = (u: string) => {
    if (!seenRaw[u] && raws.length < 300) { seenRaw[u] = true; raws.push(u); }
  };

  // OpenGraph / twitter hero images first (most reliable, publicly fetchable).
  for (const re of [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi,
  ]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) add(m[1]);
  }
  // <img src=""> and data-src/data-lazy variants (SPAs often lazy-load).
  const attrRe =
    /<img[^>]+(?:src|data-src|data-lazy|data-original|data-lazy-src)=["']([^"']+?\.(?:jpe?g|webp|png)(?:\?[^"']*)?)["']/gi;
  let a: RegExpExecArray | null;
  while ((a = attrRe.exec(html))) add(a[1]);
  // srcset — largest candidate wins. Format: "url1 320w, url2 640w, url3 1280w".
  const srcsetRe = /<img[^>]+srcset=["']([^"']+)["']/gi;
  let s: RegExpExecArray | null;
  while ((s = srcsetRe.exec(html))) {
    const set = s[1]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    let best = "";
    let bestW = 0;
    for (const p of set) {
      const [u, w] = p.split(/\s+/);
      const wn = Number((w || "0").replace("w", "").replace("x", ""));
      if (!best || wn > bestW) { best = u; bestW = wn; }
    }
    if (best) add(best);
  }
  // Then any image-file URLs in the markup / embedded JSON.
  const re = /https?:\\?\/\\?\/[^"'\s<>()]+?\.(?:jpe?g|webp|png)(?:\?[^"'\s<>]*)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) add(m[0].replace(/\\\//g, "/"));

  const bad = /(logo|icon|sprite|favicon|avatar|placeholder|badge|pixel|1x1|blank|flag|thumb_small|watermark|banner_ad|danbolig20\d\d)/i;
  const base = (() => { try { return new URL(pageUrl).origin; } catch { return ""; } })();

  // Deduplicate by the "underlying" image — many portals emit 6-10 size variants
  // of the same photo. Group by stem, keep the highest-res URL per group.
  const stems = Object.create(null) as Record<string, { url: string; score: number }>;
  const stemOrder: string[] = [];
  for (const raw of raws) {
    const u = decode(raw).trim();
    const absolute = (u.startsWith("//") ? "https:" + u : u.startsWith("/") ? base + u : u)
      // www.danbolig.dk 301s media to the bare host, and browsers block the
      // cross-origin redirect for <img> (ORB), so point straight at it.
      .replace(/^https?:\/\/www\.danbolig\.dk\//i, "https://danbolig.dk/");
    if (!/^https?:\/\//.test(absolute) || bad.test(absolute)) continue;
    const dims =
      absolute.match(/Size(\d+)x(\d+)/i) ||
      absolute.match(/(\d{3,4})x(\d{3,4})/) ||
      absolute.match(/[?&](?:w|width)=(\d+)/i);
    const score = dims ? Number(dims[1] || 0) : 0;
    const stem = absolute
      .replace(/(_Size\d+x\d+)/i, "_SIZE")
      .replace(/(-\d{2,4}x\d{2,4})(?=\.\w+$)/i, "-DIM")
      .replace(/[?&](?:w|width|h|height|size|quality|q)=\d+/gi, "")
      .replace(/[?&]$/, "");
    const cur = stems[stem];
    if (!cur) { stems[stem] = { url: absolute, score }; stemOrder.push(stem); }
    else if (score > cur.score) { cur.url = absolute; cur.score = score; }
  }

  return stemOrder
    .map((k) => stems[k])
    .sort((x, y) => y.score - x.score)
    .map((x) => x.url)
    .slice(0, 30);
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

// Mægler pages (EDC and others) often give the street without postnummer and
// keep the price in microdata; fill both from the raw HTML so no listing
// arrives without them.
function fillGaps(f: Fields, html: string) {
  if (f.address && !/\b\d{4}\b/.test(String(f.address))) {
    const zip = html.match(/"(?:postalCode|zipCode|zipcode)"\s*:\s*"?(\d{4})/)?.[1] ?? html.match(/postalCode"?>\s*(\d{4})</)?.[1];
    const city = html.match(/"addressLocality"\s*:\s*"([^"]{2,40})"/)?.[1];
    if (zip) f.address = `${f.address}, ${zip}${city ? ` ${city}` : ""}`;
  }
  if (!f.price) {
    const p = Number(html.match(/"price"\s*:\s*(?:\{\s*"value"\s*:\s*)?(\d{6,9})\b/)?.[1]);
    if (p > 100000) f.price = p;
  }
}

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
