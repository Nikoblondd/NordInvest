import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort extractor: fetches a Danish property listing and pulls the sale
// price + area (m²) from JSON-LD, OpenGraph, or plain-text patterns. Rent is not
// listed on for-sale pages, so the client estimates it from the area.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }
  // Block internal hosts (SSRF guard)
  try {
    const host = new URL(url).hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0)/.test(host)) {
      return NextResponse.json({ ok: false, error: "blocked_host" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `fetch_${res.status}` });
    }
    const html = await res.text();
    const price = extractPrice(html);
    const area = extractArea(html);
    const address = extractTitle(html);
    if (!price && !area) {
      return NextResponse.json({ ok: false, error: "nothing_found" });
    }
    return NextResponse.json({ ok: true, price, area, address });
  } catch {
    return NextResponse.json({ ok: false, error: "fetch_failed" });
  }
}

function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      /* ignore malformed */
    }
  }
  return out;
}

function deepFindNumber(obj: unknown, keys: string[]): number | null {
  if (obj == null) return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const v = deepFindNumber(item, keys);
      if (v) return v;
    }
    return null;
  }
  if (typeof obj === "object") {
    for (const [k, val] of Object.entries(obj as Record<string, unknown>)) {
      if (keys.includes(k.toLowerCase())) {
        const n = toNumber(val);
        if (n && n > 100000) return n;
      }
      const nested = deepFindNumber(val, keys);
      if (nested) return nested;
    }
  }
  return null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d]/g, "");
    if (cleaned) return Number(cleaned);
  }
  return null;
}

function extractPrice(html: string): number | null {
  // 1) JSON-LD offers/price
  for (const block of jsonLdBlocks(html)) {
    const n = deepFindNumber(block, ["price", "amount", "kontantpris"]);
    if (n) return n;
  }
  // 2) OG / meta
  const meta = html.match(
    /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([\d.,]+)["']/i,
  );
  if (meta) {
    const n = Number(meta[1].replace(/[^\d]/g, ""));
    if (n > 100000) return n;
  }
  // 3) Plain text: "2.495.000 kr" / "kr. 2.495.000" (Danish thousands with dots)
  const candidates: number[] = [];
  const re = /(\d{1,3}(?:\.\d{3}){1,3})\s*(?:kr|dkk)/gi;
  let m;
  while ((m = re.exec(html))) {
    const n = Number(m[1].replace(/\./g, ""));
    if (n >= 200000 && n <= 100000000) candidates.push(n);
  }
  if (candidates.length) {
    // the listing price is typically the largest kr figure on the page
    return Math.max(...candidates);
  }
  return null;
}

function extractArea(html: string): number | null {
  const m = html.match(/(\d{2,4})\s*(?:m²|m2|kvm|m&sup2;|m<sup>2)/i);
  if (m) {
    const n = Number(m[1]);
    if (n >= 15 && n <= 2000) return n;
  }
  return null;
}

function extractTitle(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return decodeEntities(og[1]).slice(0, 120);
  const t = html.match(/<title>([^<]+)<\/title>/i);
  if (t) return decodeEntities(t[1]).slice(0, 120);
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .trim();
}
