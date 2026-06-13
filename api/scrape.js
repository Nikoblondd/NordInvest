export const config = { runtime: 'edge' };

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'da,en-US;q=0.9,en;q=0.8,nb;q=0.7,sv;q=0.6',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

function guessCurrency(url) {
  const u = url.toLowerCase();
  // Danish portals
  if (u.match(/\.(dk)(\/|$|\?|#)/)) return 'DKK';
  if (u.includes('boliga.dk') || u.includes('home.dk') || u.includes('edc.dk') ||
      u.includes('nybolig.dk') || u.includes('danbolig.dk') || u.includes('estate.dk') ||
      u.includes('boligsiden.dk') || u.includes('boligportal.dk') || u.includes('lejebolig.dk')) return 'DKK';
  // Swedish
  if (u.match(/\.(se)(\/|$|\?|#)/)) return 'SEK';
  if (u.includes('hemnet.se') || u.includes('bovision.se') || u.includes('blocket.se')) return 'SEK';
  // Norwegian
  if (u.match(/\.(no)(\/|$|\?|#)/)) return 'NOK';
  if (u.includes('finn.no') || u.includes('hybel.no') || u.includes('eiendom.no')) return 'NOK';
  // British
  if (u.includes('.co.uk') || u.includes('rightmove') || u.includes('zoopla') || u.includes('onthemarket')) return 'GBP';
  // American
  if (u.includes('zillow.com') || u.includes('realtor.com') || u.includes('redfin.com')) return 'USD';
  // Swiss
  if (u.match(/\.(ch)(\/|$|\?|#)/)) return 'CHF';
  return 'EUR';
}

function parsePrice(str) {
  if (!str && str !== 0) return null;
  const cleaned = String(str).replace(/\s/g, '').replace(/\.(?=\d{3})/g, '').replace(/,(?=\d{3})/g, '');
  const n = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  return isNaN(n) || n < 5000 ? null : Math.round(n);
}

function parseSmallNumber(str) {
  if (!str && str !== 0) return null;
  const cleaned = String(str).replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  const n = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
  return isNaN(n) || n < 1 ? null : Math.round(n);
}

// ── JSON-LD ───────────────────────────────────────────────────────────────
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
          if (obj.floorSize?.value && !result.squareMeters) result.squareMeters = parseInt(obj.floorSize.value);
          if (obj.numberOfRooms && !result.rooms) result.rooms = parseInt(obj.numberOfRooms);
          if (obj.yearBuilt && !result.buildYear) result.buildYear = parseInt(obj.yearBuilt);
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

// ── __NEXT_DATA__ ─────────────────────────────────────────────────────────
function extractFromNextData(html) {
  const result = {};
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return result;
  try {
    const str = m[1];

    // Price — Danish first, then generic
    for (const pat of [
      /"(?:kontantpris|cashPrice|listPrice|askingPrice|salePrice|prisantydning|totalPrice|price)":\s*(\d{5,12})/,
      /"(?:amount|value)":\s*(\d{5,12})/,
    ]) {
      const pm = str.match(pat);
      if (pm) { result.price = parseInt(pm[1]); break; }
    }

    // Monthly owner expenses (ejerudgift)
    for (const pat of [
      /"(?:ejerudgift|ownerExpenses?|monthlyExpenses?|ownerCosts?|expenses|monthlyFee|housingCost)":\s*(\d{3,7})/i,
      /"(?:ejerudgiftPrMd|monthlyOwnerCost)":\s*(\d{3,7})/i,
    ]) {
      const pm = str.match(pat);
      if (pm) { result.monthlyExpenses = parseInt(pm[1]); break; }
    }

    // Down payment (udbetaling)
    for (const pat of [
      /"(?:udbetaling|downPayment|depositAmount|deposit)":\s*(\d{4,12})/i,
    ]) {
      const pm = str.match(pat);
      if (pm) { result.downPayment = parseInt(pm[1]); break; }
    }

    // Square meters
    for (const pat of [
      /"(?:boligareal|livingArea|squareMeter|size|areal|usableArea|floor_area)":\s*(\d{2,4})/i,
    ]) {
      const pm = str.match(pat);
      if (pm) { result.squareMeters = parseInt(pm[1]); break; }
    }

    // Rooms
    for (const pat of [
      /"(?:vaerelser|varelseAntal|rooms|numberOfRooms|roomCount|bedrooms)":\s*(\d{1,2})/i,
    ]) {
      const pm = str.match(pat);
      if (pm) { result.rooms = parseInt(pm[1]); break; }
    }

    // Build year
    for (const pat of [
      /"(?:opfoerelsesaar|byggeaar|byggeår|buildYear|constructionYear|yearBuilt|yearOfConstruction)":\s*(\d{4})/i,
    ]) {
      const pm = str.match(pat);
      if (pm) { result.buildYear = parseInt(pm[1]); break; }
    }

    // Location
    for (const pat of [
      /"(?:adresse|streetAddress|vejnavn)":\s*"([^"]{3,100})"/,
      /"(?:location|address|full_address|municipality|city|postalTown|stedsnavn|by)":\s*"([^"]{3,100})"/,
    ]) {
      const lm = str.match(pat);
      if (lm && !lm[1].includes('{') && !lm[1].includes('@') && !lm[1].includes('\\u')) {
        result.location = lm[1];
        break;
      }
    }

    // Title
    const titleM = str.match(/"(?:heading|title|name|overskrift)":\s*"([^"]{5,120})"/);
    if (titleM) result.title = titleM[1];
  } catch (_) {}
  return result;
}

// ── Danish site-specific extraction ──────────────────────────────────────
function extractDanish(html, url) {
  const result = {};
  const u = url.toLowerCase();
  const isDanish = u.includes('.dk');
  if (!isDanish) return result;

  // Kontantpris — appears as "2.895.000 kr." or "2 895 000 kr" in body text
  const pricePatterns = [
    /[Kk]ontantpris[:\s]*(?:ca\.?\s*)?([\d.,\s]{5,15})\s*(?:kr|DKK)/,
    /([\d.,\s]{5,15})\s*kr\.\s*(?=<)/,
    /["'](?:price|kontantpris)["']:\s*(\d{5,12})/i,
  ];
  for (const pat of pricePatterns) {
    const pm = html.match(pat);
    if (pm) { const n = parsePrice(pm[1]); if (n) { result.price = n; break; } }
  }

  // Ejerudgift pr. md.
  const expensePatterns = [
    /[Ee]jerudgift[^0-9]{0,30}?([\d.,\s]{3,8})\s*(?:kr|DKK)/,
    /["'](?:ejerudgift|ownerExpenses?|monthlyExpenses?)['":\s]+(\d{3,7})/i,
  ];
  for (const pat of expensePatterns) {
    const pm = html.match(pat);
    if (pm) { const n = parseSmallNumber(pm[1]); if (n) { result.monthlyExpenses = n; break; } }
  }

  // Udbetaling
  const downPatterns = [
    /[Uu]dbetaling[^0-9]{0,20}?([\d.,\s]{4,12})\s*(?:kr|DKK)/,
    /["'](?:udbetaling|downPayment)['":\s]+(\d{4,12})/i,
  ];
  for (const pat of downPatterns) {
    const pm = html.match(pat);
    if (pm) { const n = parsePrice(pm[1]); if (n) { result.downPayment = n; break; } }
  }

  // m²
  const sqmM = html.match(/(?:boligareal|Boligareal)[^0-9]{0,10}(\d{2,4})\s*m/);
  if (sqmM) result.squareMeters = parseInt(sqmM[1]);
  if (!result.squareMeters) {
    const sqmM2 = html.match(/(\d{2,4})\s*m[²2]/);
    if (sqmM2) result.squareMeters = parseInt(sqmM2[1]);
  }

  // Rooms / værelser
  const roomM = html.match(/(\d{1,2})\s*(?:v[æe]relser|rooms)/i);
  if (roomM) result.rooms = parseInt(roomM[1]);

  // Build year
  const yearM = html.match(/(?:[Bb]yggeår|[Oo]pf[øo]relsesår|[Aa]ar)[^0-9]{0,10}(\d{4})/);
  if (yearM && parseInt(yearM[1]) > 1800) result.buildYear = parseInt(yearM[1]);

  // boliga.dk address pattern
  if (u.includes('boliga.dk')) {
    const addrM = html.match(/"(?:adresse|address)":\s*"([^"]{5,100})"/);
    if (addrM) result.location = addrM[1];
  }

  // home.dk / edc.dk address
  if (u.includes('home.dk') || u.includes('edc.dk') || u.includes('nybolig.dk') || u.includes('danbolig.dk')) {
    const addrM = html.match(/"(?:streetAddress|address|vejnavn)":\s*"([^"]{5,100})"/);
    if (addrM) result.location = addrM[1];
  }

  return result;
}

// ── Generic site-specific ─────────────────────────────────────────────────
function extractSiteSpecific(html, url) {
  const result = {};
  if (url.includes('finn.no')) {
    const pm = html.match(/(\d[\d\s]{3,12}\d)\s*(?:kr|NOK)/);
    if (pm) result.price = parsePrice(pm[1]);
    const lm = html.match(/"(?:adresse|location)":\s*"([^"]{5,100})"/);
    if (lm) result.location = lm[1];
  }
  if (url.includes('hemnet.se')) {
    const pm = html.match(/(\d[\d\s]{3,12}\d)\s*(?:kr|SEK)/);
    if (pm) result.price = parsePrice(pm[1]);
  }
  if (url.includes('rightmove.co.uk')) {
    const pm = html.match(/£\s*([\d,]+)/);
    if (pm) result.price = parsePrice(pm[1]);
  }
  if (url.includes('zillow.com')) {
    const pm = html.match(/\$\s*([\d,]+)/);
    if (pm) result.price = parsePrice(pm[1]);
  }
  return result;
}

// ── Meta tags ─────────────────────────────────────────────────────────────
function extractFromMeta(html) {
  const result = {};
  const og = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]*property="${prop}"[^>]*content="([^"]*)"`, 'i'))
      || html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${prop}"`, 'i'));
    return m?.[1] || null;
  };
  const meta = (name) => html.match(new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, 'i'))?.[1] || null;
  result.title = og('og:title') || meta('title') || html.match(/<title[^>]*>([^<]{3,200})<\/title>/i)?.[1]?.trim() || null;
  return result;
}

// ── Body text fallback for price ──────────────────────────────────────────
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
      if (out[k] == null && v != null) out[k] = v;
    }
  }
  return out;
}

// ── Handler ───────────────────────────────────────────────────────────────
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

    const currency = guessCurrency(url);
    const merged = merge(
      extractDanish(html, url),           // Danish-specific first (highest priority)
      extractFromJsonLd(html),
      extractFromNextData(html),
      extractSiteSpecific(html, url),
      extractFromMeta(html),
      extractBodyFallback(html),
    );

    return new Response(JSON.stringify({
      success: true,
      price: merged.price || null,
      currency,
      location: merged.location || null,
      title: merged.title || null,
      downPayment: merged.downPayment || null,
      monthlyExpenses: merged.monthlyExpenses || null,
      squareMeters: merged.squareMeters || null,
      rooms: merged.rooms || null,
      buildYear: merged.buildYear || null,
    }), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
  }
}
