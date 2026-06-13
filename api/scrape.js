export const config = { runtime: 'edge' };

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,nb;q=0.8,sv;q=0.7,da;q=0.6',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

const FX = { NOK: 0.0882, SEK: 0.0870, DKK: 0.134, GBP: 1.17, USD: 0.92, EUR: 1, CHF: 1.08, AUD: 0.60, CAD: 0.68 };

function toEur(amount, currency) {
  return Math.round(amount * (FX[(currency || 'EUR').toUpperCase()] || 1));
}

function guessCurrency(url, html) {
  const u = url.toLowerCase();
  if (u.includes('finn.no') || u.includes('hybel.no') || u.includes('eiendom.no')) return 'NOK';
  if (u.includes('hemnet.se') || u.includes('bovision.se') || u.includes('blocket.se')) return 'SEK';
  if (u.includes('boligsiden.dk') || u.includes('boligportal.dk')) return 'DKK';
  if (u.includes('rightmove.co.uk') || u.includes('zoopla.co.uk') || u.includes('onthemarket.com')) return 'GBP';
  if (u.includes('zillow.com') || u.includes('realtor.com') || u.includes('redfin.com')) return 'USD';
  if (/\bNOK\b/.test(html)) return 'NOK';
  if (/\bSEK\b/.test(html)) return 'SEK';
  if (/£|GBP/.test(html)) return 'GBP';
  return 'EUR';
}

function parsePrice(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/\s/g, '').replace(/\.(?=\d{3})/g, '').replace(/,(?=\d{3})/g, '');
  const n = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  return isNaN(n) || n < 5000 ? null : Math.round(n);
}

function extractFromJsonLd(html) {
  const result = {};
  const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    try {
      const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        const t = String(obj['@type'] || '');
        if (t.match(/RealEstate|House|Apartment|Residence|Product|Offer/i)) {
          const pr = obj.price ?? obj.offers?.price ?? obj.offers?.priceSpecification?.price;
          if (pr && !result.price) result.price = parsePrice(pr);
          if (obj.address && !result.location) {
            const a = obj.address;
            result.location = [a.streetAddress, a.addressLocality, a.addressRegion, a.addressCountry]
              .filter(Boolean).join(', ');
          }
          if (obj.name && !result.title) result.title = obj.name;
        }
        Object.values(obj).forEach(v => typeof v === 'object' && walk(v));
      };
      const parsed = JSON.parse(m[1]);
      (Array.isArray(parsed) ? parsed : [parsed]).forEach(walk);
    } catch (_) {}
  }
  return result;
}

function extractFromNextData(html) {
  const result = {};
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return result;
  try {
    const str = m[1];
    const pricePatterns = [
      /"(?:price|askingPrice|totalPrice|listPrice|salePrice|prisantydning)":\s*(\d{5,12})/,
      /"(?:amount|value)":\s*(\d{5,12})/,
    ];
    for (const pat of pricePatterns) {
      const pm = str.match(pat);
      if (pm) { result.price = parseInt(pm[1]); break; }
    }
    const locPatterns = [
      /"(?:location|address|full_address|municipality|city|postalTown|stedsnavn|adresse)":\s*"([^"]{3,100})"/,
      /"streetAddress":\s*"([^"]{3,100})"/,
    ];
    for (const pat of locPatterns) {
      const lm = str.match(pat);
      if (lm && !lm[1].includes('{') && !lm[1].includes('@') && !lm[1].includes('\\u')) {
        result.location = lm[1];
        break;
      }
    }
    const titleM = str.match(/"(?:heading|title|name)":\s*"([^"]{5,120})"/);
    if (titleM) result.title = titleM[1];
  } catch (_) {}
  return result;
}

function extractFromMeta(html) {
  const result = {};
  const og = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]*property="${prop}"[^>]*content="([^"]*)"`, 'i'))
      || html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${prop}"`, 'i'));
    return m?.[1] || null;
  };
  const meta = (name) => {
    const m = html.match(new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, 'i'));
    return m?.[1] || null;
  };
  result.title = og('og:title') || meta('title') || html.match(/<title[^>]*>([^<]{3,200})<\/title>/i)?.[1]?.trim() || null;
  result.description = og('og:description') || meta('description') || null;

  // Sometimes price is in description
  if (result.description) {
    const pm = result.description.match(/(\d[\d\s,.]{4,14}\d)/);
    if (pm) {
      const n = parsePrice(pm[1]);
      if (n && n > 40000) result.price = n;
    }
  }
  return result;
}

function extractSiteSpecific(html, url) {
  const result = {};
  // finn.no — prices in format "3 500 000 kr"
  if (url.includes('finn.no')) {
    const pm = html.match(/(\d[\d\s]{3,12}\d)\s*(?:kr|NOK)/);
    if (pm) result.price = parsePrice(pm[1]);
    const lm = html.match(/"(?:adresse|location)":\s*"([^"]{5,100})"/);
    if (lm) result.location = lm[1];
  }
  // hemnet.se
  if (url.includes('hemnet.se')) {
    const pm = html.match(/(\d[\d\s]{3,12}\d)\s*(?:kr|SEK)/);
    if (pm) result.price = parsePrice(pm[1]);
  }
  // rightmove
  if (url.includes('rightmove.co.uk')) {
    const pm = html.match(/£\s*([\d,]+)/);
    if (pm) result.price = parsePrice(pm[1]);
  }
  // zillow
  if (url.includes('zillow.com')) {
    const pm = html.match(/\$\s*([\d,]+)/);
    if (pm) result.price = parsePrice(pm[1]);
  }
  return result;
}

function extractBodyFallback(html) {
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const candidates = (stripped.match(/(\d[\d\s,.]{4,14}\d)/g) || [])
    .map(parsePrice).filter(n => n && n >= 40000 && n <= 80000000).sort((a, b) => b - a);
  return candidates[0] ? { price: candidates[0] } : {};
}

function merge(...sources) {
  const out = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      if (!out[k] && v) out[k] = v;
    }
  }
  return out;
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  if (!url) return new Response(JSON.stringify({ error: 'url parameter required' }), { status: 400, headers: cors });

  try { new URL(url); } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), { status: 400, headers: cors });
  }

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
    const html = await res.text();

    const currency = guessCurrency(url, html);
    const merged = merge(
      extractFromJsonLd(html),
      extractFromNextData(html),
      extractSiteSpecific(html, url),
      extractFromMeta(html),
      extractBodyFallback(html),
    );

    const priceEur = merged.price ? toEur(merged.price, currency) : null;

    return new Response(JSON.stringify({
      success: true,
      price: merged.price || null,
      priceEur,
      currency,
      location: merged.location || null,
      title: merged.title || null,
    }), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
  }
}
