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

// ── Energy label (A-G) ────────────────────────────────────────────────────
function extractEnergyLabel(html) {
  // Danish "Energimærke: A" / "Energimærke A2020"
  const patterns = [
    /[Ee]nergim[æe]rke[:\s]*([A-G])(?![a-z])/,
    /[Ee]nergy\s*[Cc]lass[:\s]*([A-G])(?![a-z])/,
    /"energy(?:Class|Label|Rating|Mark)":\s*"([A-G])"/i,
    /energiklass[:\s]*([A-G])(?![a-z])/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

// ── Property type ─────────────────────────────────────────────────────────
function extractPropertyType(html, url) {
  const u = url.toLowerCase();
  // JSON keys first
  const jm = html.match(/"(?:propertyType|boligtype|type|category)":\s*"([^"]{3,40})"/i);
  if (jm) {
    const t = jm[1].toLowerCase();
    if (t.match(/villa|enfamiliehus|house/)) return 'Villa';
    if (t.match(/lejlighed|apartment|leilighet/)) return 'Lejlighed';
    if (t.match(/r[æa]kkehus|townhouse|rekkehus|radhus/)) return 'Rækkehus';
    if (t.match(/andel/)) return 'Andelsbolig';
    if (t.match(/sommerhus|fritidsbolig/)) return 'Sommerhus';
    if (t.match(/erhverv|commercial/)) return 'Erhverv';
  }
  // URL patterns
  if (u.match(/villa|enfamilie/)) return 'Villa';
  if (u.match(/lejlighed|apartment/)) return 'Lejlighed';
  if (u.match(/raekkehus|rakkehus|townhouse/)) return 'Rækkehus';
  if (u.match(/andels/)) return 'Andelsbolig';
  return null;
}

// ── Description text (for condition analysis) ─────────────────────────────
function extractDescription(html) {
  // Try JSON-LD description first
  const jld = html.match(/"description":\s*"((?:[^"\\]|\\.){50,2500})"/);
  if (jld) return jld[1].replace(/\\n/g, ' ').replace(/\\"/g, '"').slice(0, 2000);

  // og:description
  const og = html.match(/<meta[^>]*(?:property|name)="og:description"[^>]*content="([^"]{50,2000})"/i)
        || html.match(/<meta[^>]*content="([^"]{50,2000})"[^>]*(?:property|name)="og:description"/i);
  if (og) return og[1];

  // meta description
  const md = html.match(/<meta[^>]*name="description"[^>]*content="([^"]{50,2000})"/i);
  if (md) return md[1];
  return '';
}

// ── Condition analysis (heuristic keyword scan) ───────────────────────────
function analyzeCondition(description, buildYear) {
  const t = (description || '').toLowerCase();
  const flags = [];

  // Positive signals
  const pos = [
    { rx: /nyistandsat|totalrenoveret|gennemgribende renoveret|fully renovated|totally renovated|recently renovated|newly renovated|nyrenoveret/, label: 'Recently renovated', severity: 'good' },
    { rx: /velholdt|vedligeholdt|god stand|godt vedligeholdt|well[- ]maintained|move[- ]in ready|turn[- ]key|move-in condition/, label: 'Well maintained', severity: 'good' },
    { rx: /nyt k[øo]kken|new kitchen|k[øo]kken fra 20[12]\d|kitchen from 20[12]\d/, label: 'New kitchen', severity: 'good' },
    { rx: /nyt bad|nyt badev[æa]relse|new bathroom|badev[æa]relse fra 20[12]\d/, label: 'New bathroom', severity: 'good' },
    { rx: /nyt tag|new roof|tag fra 20[12]\d/, label: 'New roof', severity: 'good' },
    { rx: /nye vinduer|new windows|termovinduer fra 20[12]\d/, label: 'New windows', severity: 'good' },
  ];

  // Watch signals — needs attention, not urgent
  const watch = [
    { rx: /tr[æa]nger til (?:et )?nyt? k[øo]kken|kitchen needs (?:renovation|updating|replacing)|dated kitchen|old kitchen|k[øo]kken tr[æa]nger/, label: 'Kitchen needs work', severity: 'watch' },
    { rx: /tr[æa]nger til (?:et )?nyt? bad|bathroom needs (?:renovation|updating|replacing)|dated bathroom|old bathroom|bad tr[æa]nger/, label: 'Bathroom needs work', severity: 'watch' },
    { rx: /trænger til istands[æa]ttelse|needs (?:some )?renovation|requires (?:some )?updating|needs updating|needs modernising/, label: 'Needs updating', severity: 'watch' },
    { rx: /slidt|worn|dated finish|overfladisk|cosmetic work/, label: 'Cosmetic wear', severity: 'watch' },
    { rx: /oprindelig|original[e]? overflad|original condition/, label: 'Original condition', severity: 'watch' },
  ];

  // Alert signals — serious issues
  const alert = [
    { rx: /nyt tag p[åa]kr[æa]vet|roof (?:needs )?replac|tag skal skiftes|leaking roof|tag utæt/, label: 'Roof issue', severity: 'alert' },
    { rx: /fugtskade|moisture damage|water damage|vandskade/, label: 'Moisture damage', severity: 'alert' },
    { rx: /skimmelsvamp|mould|mold problem/, label: 'Mold', severity: 'alert' },
    { rx: /kloak(?:ering)? skal|sewer (?:needs|replacement)|kloak defekt|drain (?:needs|replacement)/, label: 'Sewer/drain issue', severity: 'alert' },
    { rx: /elinstallation (?:skal|udskiftes|forny)|electrical (?:needs|rewiring)|old wiring|gamle elinstallationer/, label: 'Electrical rewiring', severity: 'alert' },
    { rx: /solgt som beset|solgt i den stand|sold as[- ]is|as[- ]is condition|solgt som den er/, label: 'Sold as-is', severity: 'alert' },
    { rx: /kondemn|uninhabitable|uinhabitab|ubeboelig/, label: 'Uninhabitable', severity: 'alert' },
    { rx: /gennemgribende istand|major renovation required|extensive work required|kr[æa]ver istands[æa]ttelse/, label: 'Major renovation needed', severity: 'alert' },
  ];

  const seen = new Set();
  const pushFlag = (list) => {
    for (const item of list) {
      if (item.rx.test(t) && !seen.has(item.label)) {
        flags.push({ label: item.label, severity: item.severity });
        seen.add(item.label);
      }
    }
  };
  pushFlag(alert);
  pushFlag(watch);
  pushFlag(pos);

  // Build-year heuristic — very old with no positive signals
  if (buildYear && buildYear < 1960 && !flags.some(f => f.severity === 'good')) {
    flags.push({ label: `Built ${buildYear} — inspect thoroughly`, severity: 'watch' });
  }

  // 1-line summary
  let summary;
  const alerts = flags.filter(f => f.severity === 'alert');
  const goods  = flags.filter(f => f.severity === 'good');
  if (alerts.length >= 2) summary = 'Multiple significant issues flagged — inspect carefully.';
  else if (alerts.length === 1) summary = `Attention: ${alerts[0].label.toLowerCase()}.`;
  else if (goods.length >= 2)   summary = 'Move-in ready — recently updated.';
  else if (goods.length === 1)  summary = `${goods[0].label} noted.`;
  else if (flags.length > 0)    summary = 'Minor updates likely — cosmetic work.';
  else                          summary = null; // no strong signals

  return { summary, flags: flags.slice(0, 4) };
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

    // New enrichment layer — condition + property type + energy label
    const description = extractDescription(html);
    const energyLabel = extractEnergyLabel(html);
    const propertyType = extractPropertyType(html, url);
    const condition = analyzeCondition(description, merged.buildYear);

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
      propertyType: propertyType || null,
      energyLabel: energyLabel || null,
      condition,   // { summary, flags: [{label, severity}] }
    }), { status: 200, headers: cors });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: cors });
  }
}
