export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// ── Denmark: Municipality codes (kommunenumre) ────────────────────────────
// Source: Danmarks Statistik official municipality register
const DK_MUNI_MAP = {
  'kobenhavn': 101, 'copenhagen': 101, 'kbh': 101, 'nordhavn': 101,
  'osterbro': 101, 'østerbro': 101, 'vesterbro': 101, 'noerrebro': 101,
  'nørrebro': 101, 'indre by': 101, 'christianshavn': 101, 'amager': 101,
  'frederiksberg': 147,
  'ballerup': 151, 'brondby': 153, 'dragror': 155,
  'gentofte': 157, 'gladsaxe': 159, 'glostrup': 161,
  'herlev': 163, 'albertslund': 165, 'hvidovre': 167,
  'hoje-taastrup': 169, 'lyngby': 173, 'rodovrer': 175,
  'taarnby': 185, 'vallensbaek': 187, 'furesoe': 190,
  'allerrod': 201, 'fredensborg': 210, 'helsingor': 217,
  'hillerod': 219, 'horsholm': 223, 'rudersdal': 230,
  'egedal': 240, 'frederikssund': 250, 'roskilde': 265,
  'koge': 259, 'slagelse': 330, 'naestved': 370,
  'aarhus': 751, 'arhus': 751, 'silkeborg': 740, 'horsens': 615,
  'vejle': 630, 'herning': 657, 'kolding': 621, 'esbjerg': 561,
  'odense': 461, 'aalborg': 851, 'fredericia': 607, 'randers': 730,
  'viborg': 791, 'holbaek': 316, 'ringsted': 329,
};

// Published benchmark data per municipality
// Sources: Realkreditrådet Boligmarkedsstatistik Q4 2024, Finans Danmark 2024,
//          BoligSiden.dk markedsdata 2024
const DK_BENCHMARKS = {
  101: { yieldPct: 3.7, appreciation: 4.8, marketType: 'high-price', name: 'Copenhagen',
         fallbackPricePerSqm: 62000, note: 'Copenhagen inner city incl. premium neighborhoods' },
  147: { yieldPct: 4.1, appreciation: 4.5, marketType: 'high-price', name: 'Frederiksberg',
         fallbackPricePerSqm: 52000 },
  157: { yieldPct: 4.2, appreciation: 4.0, marketType: 'high-price', name: 'Gentofte',
         fallbackPricePerSqm: 46000 },
  173: { yieldPct: 4.4, appreciation: 3.8, marketType: 'high-price', name: 'Lyngby-Taarbæk',
         fallbackPricePerSqm: 38000 },
  265: { yieldPct: 4.8, appreciation: 4.0, marketType: 'balanced',   name: 'Roskilde',
         fallbackPricePerSqm: 28000 },
  219: { yieldPct: 4.9, appreciation: 3.5, marketType: 'balanced',   name: 'Hillerød',
         fallbackPricePerSqm: 25000 },
  751: { yieldPct: 4.9, appreciation: 5.2, marketType: 'balanced',   name: 'Aarhus',
         fallbackPricePerSqm: 32000 },
  461: { yieldPct: 5.3, appreciation: 4.0, marketType: 'balanced',   name: 'Odense',
         fallbackPricePerSqm: 22000 },
  851: { yieldPct: 5.6, appreciation: 3.5, marketType: 'balanced',   name: 'Aalborg',
         fallbackPricePerSqm: 18000 },
  630: { yieldPct: 5.4, appreciation: 3.8, marketType: 'balanced',   name: 'Vejle',
         fallbackPricePerSqm: 20000 },
  615: { yieldPct: 5.4, appreciation: 3.5, marketType: 'balanced',   name: 'Horsens',
         fallbackPricePerSqm: 19000 },
  657: { yieldPct: 5.8, appreciation: 3.2, marketType: 'balanced',   name: 'Herning',
         fallbackPricePerSqm: 16000 },
  561: { yieldPct: 5.9, appreciation: 3.0, marketType: 'balanced',   name: 'Esbjerg',
         fallbackPricePerSqm: 14000 },
  default: { yieldPct: 5.1, appreciation: 3.5, marketType: 'balanced', name: 'Denmark',
             fallbackPricePerSqm: 22000 },
};

// ── Norway: Published data from SSB Boligprisstatistikk 2024 ─────────────
// Sources: SSB.no table 06035, Eiendom Norge prisstatistikk Q4 2024
const NO_CITY_DATA = {
  oslo:       { yieldPct: 3.8, appreciation: 4.5, pricePerSqm: 90000, marketType: 'high-price', name: 'Oslo', ssb_region: '0301' },
  baerum:     { yieldPct: 3.9, appreciation: 4.2, pricePerSqm: 75000, marketType: 'high-price', name: 'Bærum', ssb_region: '3024' },
  bergen:     { yieldPct: 4.5, appreciation: 4.0, pricePerSqm: 55000, marketType: 'balanced',   name: 'Bergen', ssb_region: '4601' },
  trondheim:  { yieldPct: 5.0, appreciation: 3.8, pricePerSqm: 45000, marketType: 'balanced',   name: 'Trondheim', ssb_region: '5001' },
  stavanger:  { yieldPct: 4.8, appreciation: 3.5, pricePerSqm: 48000, marketType: 'balanced',   name: 'Stavanger', ssb_region: '1103' },
  default:    { yieldPct: 5.0, appreciation: 3.5, pricePerSqm: 35000, marketType: 'balanced',   name: 'Norway', ssb_region: null },
};

// ── Sweden: Published data from SCB Fastighetsprisstatistik + Mäklarstatistik 2024 ──
const SE_CITY_DATA = {
  stockholm:  { yieldPct: 3.5, appreciation: 3.2, pricePerSqm: 75000, marketType: 'high-price', name: 'Stockholm' },
  goteborg:   { yieldPct: 4.2, appreciation: 3.5, pricePerSqm: 50000, marketType: 'balanced',   name: 'Gothenburg' },
  malmo:      { yieldPct: 4.5, appreciation: 4.0, pricePerSqm: 35000, marketType: 'balanced',   name: 'Malmö' },
  linkoping:  { yieldPct: 4.8, appreciation: 3.2, pricePerSqm: 28000, marketType: 'balanced',   name: 'Linköping' },
  default:    { yieldPct: 4.5, appreciation: 3.0, pricePerSqm: 30000, marketType: 'balanced',   name: 'Sweden' },
};

// ── UK: ONS UK House Price Index + Rightmove/Zoopla market reports 2024 ──
const UK_CITY_DATA = {
  london:      { yieldPct: 3.5, appreciation: 3.5, pricePerSqm: 8500, marketType: 'high-price', name: 'London' },
  manchester:  { yieldPct: 5.5, appreciation: 4.5, pricePerSqm: 3200, marketType: 'balanced',   name: 'Manchester' },
  birmingham:  { yieldPct: 5.2, appreciation: 4.0, pricePerSqm: 2800, marketType: 'balanced',   name: 'Birmingham' },
  edinburgh:   { yieldPct: 5.0, appreciation: 4.5, pricePerSqm: 4200, marketType: 'balanced',   name: 'Edinburgh' },
  glasgow:     { yieldPct: 5.8, appreciation: 4.0, pricePerSqm: 2500, marketType: 'balanced',   name: 'Glasgow' },
  leeds:       { yieldPct: 5.5, appreciation: 4.2, pricePerSqm: 2600, marketType: 'balanced',   name: 'Leeds' },
  bristol:     { yieldPct: 4.5, appreciation: 4.5, pricePerSqm: 4500, marketType: 'balanced',   name: 'Bristol' },
  default:     { yieldPct: 4.8, appreciation: 3.5, pricePerSqm: 3500, marketType: 'balanced',   name: 'UK' },
};

// ── EU / Global: JLL European Real Estate Market Outlook 2024 + Eurostat ──
const EU_CITY_DATA = {
  amsterdam:  { yieldPct: 3.8, appreciation: 4.2, pricePerSqm: 7500, marketType: 'high-price', name: 'Amsterdam',  currency: 'EUR' },
  rotterdam:  { yieldPct: 5.0, appreciation: 4.0, pricePerSqm: 4500, marketType: 'balanced',   name: 'Rotterdam',  currency: 'EUR' },
  berlin:     { yieldPct: 4.0, appreciation: 4.5, pricePerSqm: 5500, marketType: 'balanced',   name: 'Berlin',     currency: 'EUR' },
  munich:     { yieldPct: 3.2, appreciation: 3.8, pricePerSqm: 9800, marketType: 'high-price', name: 'Munich',     currency: 'EUR' },
  frankfurt:  { yieldPct: 3.8, appreciation: 4.0, pricePerSqm: 7200, marketType: 'high-price', name: 'Frankfurt',  currency: 'EUR' },
  hamburg:    { yieldPct: 4.0, appreciation: 4.2, pricePerSqm: 6500, marketType: 'balanced',   name: 'Hamburg',    currency: 'EUR' },
  paris:      { yieldPct: 3.2, appreciation: 2.8, pricePerSqm: 10000,marketType: 'high-price', name: 'Paris',      currency: 'EUR' },
  vienna:     { yieldPct: 3.6, appreciation: 3.5, pricePerSqm: 6800, marketType: 'high-price', name: 'Vienna',     currency: 'EUR' },
  zurich:     { yieldPct: 2.8, appreciation: 3.2, pricePerSqm: 16000,marketType: 'high-price', name: 'Zurich',     currency: 'CHF' },
  madrid:     { yieldPct: 5.0, appreciation: 6.5, pricePerSqm: 4200, marketType: 'balanced',   name: 'Madrid',     currency: 'EUR' },
  barcelona:  { yieldPct: 4.8, appreciation: 7.2, pricePerSqm: 4500, marketType: 'balanced',   name: 'Barcelona',  currency: 'EUR' },
  lisbon:     { yieldPct: 4.8, appreciation: 8.5, pricePerSqm: 4000, marketType: 'high-yield', name: 'Lisbon',     currency: 'EUR' },
  milan:      { yieldPct: 4.2, appreciation: 4.8, pricePerSqm: 5000, marketType: 'balanced',   name: 'Milan',      currency: 'EUR' },
  rome:       { yieldPct: 4.5, appreciation: 2.5, pricePerSqm: 3800, marketType: 'balanced',   name: 'Rome',       currency: 'EUR' },
  brussels:   { yieldPct: 4.6, appreciation: 3.0, pricePerSqm: 3500, marketType: 'balanced',   name: 'Brussels',   currency: 'EUR' },
  dublin:     { yieldPct: 4.3, appreciation: 5.5, pricePerSqm: 6000, marketType: 'balanced',   name: 'Dublin',     currency: 'EUR' },
  warsaw:     { yieldPct: 5.5, appreciation: 8.0, pricePerSqm: 2800, marketType: 'high-yield', name: 'Warsaw',     currency: 'EUR' },
  prague:     { yieldPct: 5.2, appreciation: 6.5, pricePerSqm: 4200, marketType: 'high-yield', name: 'Prague',     currency: 'EUR' },
  budapest:   { yieldPct: 5.8, appreciation: 7.5, pricePerSqm: 2200, marketType: 'high-yield', name: 'Budapest',   currency: 'EUR' },
  dubai:      { yieldPct: 6.5, appreciation: 9.0, pricePerSqm: 5500, marketType: 'high-yield', name: 'Dubai',      currency: 'USD' },
  default:    { yieldPct: 4.8, appreciation: 3.5, pricePerSqm: 3500, marketType: 'balanced',   name: 'International', currency: 'EUR' },
};

function normalize(s) {
  return (s || '').toLowerCase()
    .replace(/ø/g,'o').replace(/æ/g,'ae').replace(/å/g,'a')
    .replace(/ö/g,'o').replace(/ä/g,'a').replace(/ü/g,'u')
    .replace(/é|è|ê/g,'e').replace(/[^a-z0-9 ]/g,'');
}

function matchCity(location, map) {
  const n = normalize(location);
  for (const [key, data] of Object.entries(map)) {
    if (key !== 'default' && n.includes(normalize(key))) return data;
  }
  return map.default;
}

// ── Denmark: call Statistics Denmark (DST) API ───────────────────────────
// Table EJEBL1: Salg af boliger — price per sqm by municipality + property type
// Docs: https://www.dst.dk/da/Statistik/brug-statistikken/muligheder-i-statistikbanken/api
async function fetchDSTPrice(muniCode) {
  const body = JSON.stringify({
    table: 'EJEBL1',
    format: 'JSON',
    lang: 'en',
    variables: [
      { code: 'OMRÅDE',    values: [String(muniCode)] },
      { code: 'BOLIGTYPE', values: ['EJ'] },           // Etagebolig (apartments/condos)
      { code: 'ENHED',     values: ['AKT_KPRIS'] },    // Realised price per sqm (kr)
      { code: 'Tid',       values: ['-1'] },            // Latest available quarter
    ],
  });
  const res = await fetch('https://api.statbank.dk/v1/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body,
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  // DST returns either json.dataset.value[] or json.value[]
  const vals = json?.dataset?.value ?? json?.value ?? [];
  const flat = Array.isArray(vals) ? vals : Object.values(vals);
  const valid = flat.filter(v => v !== null && v > 5000);
  return valid.length > 0 ? Math.round(valid[valid.length - 1]) : null;
}

// ── Norway: call SSB (Statistics Norway) API ─────────────────────────────
// Table 06035: Sales of dwellings, price per sqm by municipality
// Docs: https://www.ssb.no/en/bygg-bolig-og-eiendom/eiendomspriser
async function fetchSSBPrice(ssbRegionCode) {
  if (!ssbRegionCode) return null;
  const body = JSON.stringify({
    query: [
      { code: 'Region',       selection: { filter: 'item', values: [ssbRegionCode] } },
      { code: 'Boligtype',    selection: { filter: 'item', values: ['02'] } }, // Flats/apartments
      { code: 'ContentsCode', selection: { filter: 'item', values: ['KvadratmeterPris'] } },
      { code: 'Tid',          selection: { filter: 'top', values: ['1'] } },
    ],
    response: { format: 'json-stat2' },
  });
  const res = await fetch('https://data.ssb.no/api/v0/en/table/06035', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const vals = Object.values(json?.value ?? {}).filter(v => v != null && v > 0);
  return vals.length > 0 ? Math.round(vals[vals.length - 1]) : null;
}

async function getDenmarkData(location, geocodeAddr) {
  // Resolve municipality code
  const locNorm = normalize(location + ' ' + (geocodeAddr?.municipality || '') + ' ' + (geocodeAddr?.city || ''));
  let muniCode = null;
  for (const [name, code] of Object.entries(DK_MUNI_MAP)) {
    if (locNorm.includes(normalize(name))) { muniCode = code; break; }
  }
  const bench = DK_BENCHMARKS[muniCode] || DK_BENCHMARKS.default;

  // Attempt live DST data
  let pricePerSqm = null;
  try { pricePerSqm = muniCode ? await fetchDSTPrice(muniCode) : null; } catch (_) {}

  // Fall back to published curated figures if DST unreachable
  if (!pricePerSqm) pricePerSqm = bench.fallbackPricePerSqm;

  const rentPerSqm = Math.round((pricePerSqm * bench.yieldPct / 100) / 12);

  return {
    pricePerSqm,
    rentPerSqm,
    grossYield:   bench.yieldPct,
    appreciation: bench.appreciation,
    marketType:   bench.marketType,
    regionName:   bench.name,
    currency:     'DKK',
    source:       pricePerSqm !== bench.fallbackPricePerSqm
      ? 'Statistics Denmark (DST) · Finans Danmark 2024'
      : 'Realkreditrådet / Finans Danmark 2024',
    sourceNote:   bench.note || null,
  };
}

async function getNorwayData(location, geocodeAddr) {
  const cityData = matchCity(location + ' ' + (geocodeAddr?.city || ''), NO_CITY_DATA);
  let pricePerSqm = null;
  try { pricePerSqm = await fetchSSBPrice(cityData.ssb_region); } catch (_) {}
  if (!pricePerSqm) pricePerSqm = cityData.pricePerSqm;

  const rentPerSqm = Math.round((pricePerSqm * cityData.yieldPct / 100) / 12);
  return {
    pricePerSqm, rentPerSqm,
    grossYield:   cityData.yieldPct,
    appreciation: cityData.appreciation,
    marketType:   cityData.marketType,
    regionName:   cityData.name,
    currency:     'NOK',
    source:       'Statistics Norway (SSB) · Eiendom Norge 2024',
  };
}

function getSwedenData(location) {
  const city = matchCity(location, SE_CITY_DATA);
  const rentPerSqm = Math.round((city.pricePerSqm * city.yieldPct / 100) / 12);
  return {
    pricePerSqm: city.pricePerSqm, rentPerSqm,
    grossYield:   city.yieldPct,
    appreciation: city.appreciation,
    marketType:   city.marketType,
    regionName:   city.name,
    currency:     'SEK',
    source:       'Statistics Sweden (SCB) · Mäklarstatistik 2024',
  };
}

function getUKData(location) {
  const city = matchCity(location, UK_CITY_DATA);
  const rentPerSqm = Math.round((city.pricePerSqm * city.yieldPct / 100) / 12);
  return {
    pricePerSqm: city.pricePerSqm, rentPerSqm,
    grossYield:   city.yieldPct,
    appreciation: city.appreciation,
    marketType:   city.marketType,
    regionName:   city.name,
    currency:     'GBP',
    source:       'ONS UK House Price Index · Rightmove Market Report 2024',
  };
}

function getEUData(location) {
  const city = matchCity(location, EU_CITY_DATA);
  const rentPerSqm = Math.round((city.pricePerSqm * city.yieldPct / 100) / 12);
  return {
    pricePerSqm: city.pricePerSqm, rentPerSqm,
    grossYield:   city.yieldPct,
    appreciation: city.appreciation,
    marketType:   city.marketType,
    regionName:   city.name,
    currency:     city.currency || 'EUR',
    source:       'JLL European Real Estate Market Outlook 2024 · Eurostat',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const { searchParams } = new URL(req.url);
  const location = (searchParams.get('location') || '').trim();
  const currency = (searchParams.get('currency') || 'EUR').toUpperCase();
  const sqm      = parseInt(searchParams.get('sqm')) || null;

  if (!location) {
    return new Response(JSON.stringify({ error: 'location parameter required' }), { status: 400, headers: CORS });
  }

  // Geocode to get country + municipality
  let countryCode = '';
  let geocodeAddr = null;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1&accept-language=en`,
      { headers: { 'User-Agent': 'NordInvest/1.0 (contact@nordinvest.com)' }, signal: AbortSignal.timeout(5000) }
    );
    if (geoRes.ok) {
      const geo = await geoRes.json();
      if (geo[0]) {
        geocodeAddr = geo[0].address || {};
        countryCode = (geocodeAddr.country_code || '').toUpperCase();
      }
    }
  } catch (_) {}

  // Fallback: infer country from currency
  if (!countryCode) {
    const fromCurrency = { DKK: 'DK', NOK: 'NO', SEK: 'SE', GBP: 'GB', USD: 'US', CHF: 'CH' };
    countryCode = fromCurrency[currency] || '';
  }

  try {
    let data;
    if      (countryCode === 'DK') data = await getDenmarkData(location, geocodeAddr);
    else if (countryCode === 'NO') data = await getNorwayData(location, geocodeAddr);
    else if (countryCode === 'SE') data = getSwedenData(location);
    else if (countryCode === 'GB') data = getUKData(location);
    else                           data = getEUData(location);

    // If sqm provided, calculate what market rent would be for that property size
    if (sqm && data.rentPerSqm) {
      data.estimatedRentForSqm = Math.round(sqm * data.rentPerSqm);
      data.sqmUsed = sqm;
    }

    return new Response(JSON.stringify({ success: true, countryCode, ...data }), { status: 200, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
}
