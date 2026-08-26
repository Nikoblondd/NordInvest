import { NextRequest, NextResponse } from "next/server";

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
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }
  try {
    const host = new URL(url).hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/.test(host)) {
      return NextResponse.json({ ok: false, error: "blocked_host" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
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

  if (!f.price && !f.monthlyRent && !f.area) {
    return NextResponse.json({ ok: false, error: "nothing_found" });
  }
  return NextResponse.json({ ok: true, fields: f, found });
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
