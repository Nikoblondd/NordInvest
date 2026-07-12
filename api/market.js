// Market data API — honest sourcing.
// Reads /data/market-stats.json bundled with the deployment.
// Returns ONLY data we have a real citation for; otherwise data_available: false.
//
// Methodology and source list: /methodology
// Update the bundled file by running: node scripts/update-market-data.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Load the bundled dataset once at cold-start. Resolves relative to THIS file
// (import.meta.url) rather than process.cwd() — on Vercel's Node runtime the
// working directory is not the deployment root, so cwd-based paths crash the
// entire function with FUNCTION_INVOCATION_FAILED. This is portable to any
// hosting.
let marketStats;
let marketStatsError = null;
try {
  const here = dirname(fileURLToPath(import.meta.url));
  // Try common layouts: sibling to /api, or bundled next to the function.
  const candidates = [
    join(here, '..', 'data', 'market-stats.json'),
    join(here, 'data', 'market-stats.json'),
    join(process.cwd(), 'data', 'market-stats.json'),
  ];
  let loaded = null;
  for (const p of candidates) {
    try { loaded = readFileSync(p, 'utf8'); break; } catch (_) {}
  }
  if (!loaded) throw new Error('market-stats.json not found in any known location');
  marketStats = JSON.parse(loaded);
} catch (err) {
  // Never crash the function at cold-start — degrade gracefully at request time.
  marketStatsError = err.message || String(err);
  marketStats = { denmark: {}, sweden: {}, norway: {} };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/å/g, 'a')
    .replace(/ö/g, 'o').replace(/ä/g, 'a').replace(/ü/g, 'u')
    .replace(/é|è|ê/g, 'e')
    .replace(/[^a-z0-9 ]/g, '');
}

// Country code → bucket in market-stats.json
const COUNTRY_BUCKET = {
  DK: 'denmark',
  SE: 'sweden',
  NO: 'norway',
};

// City alias → canonical slug used in the JSON file.
const CITY_ALIASES = {
  // Denmark
  'kobenhavn': 'copenhagen', 'kbh': 'copenhagen', 'københavn': 'copenhagen',
  'nordhavn': 'copenhagen', 'osterbro': 'copenhagen', 'østerbro': 'copenhagen',
  'vesterbro': 'copenhagen', 'noerrebro': 'copenhagen', 'nørrebro': 'copenhagen',
  'indre by': 'copenhagen', 'christianshavn': 'copenhagen', 'amager': 'copenhagen',
  'aarhus': 'aarhus', 'arhus': 'aarhus', 'århus': 'aarhus',
  'odense': 'odense', 'aalborg': 'aalborg', 'ålborg': 'aalborg',
  'frederiksberg': 'frederiksberg', 'gentofte': 'gentofte',
  'lyngby': 'lyngby-taarbaek', 'lyngby-taarbaek': 'lyngby-taarbaek',
  'vejle': 'vejle', 'horsens': 'horsens', 'kolding': 'kolding',
  'esbjerg': 'esbjerg', 'roskilde': 'roskilde',
  // Sweden
  'stockholm': 'stockholm',
  'goteborg': 'gothenburg', 'gothenburg': 'gothenburg', 'göteborg': 'gothenburg',
  'malmo': 'malmo', 'malmö': 'malmo',
  'linkoping': 'linkoping', 'linköping': 'linkoping',
  'uppsala': 'uppsala',
  // Norway
  'oslo': 'oslo',
  'baerum': 'baerum', 'bærum': 'baerum',
  'bergen': 'bergen', 'trondheim': 'trondheim', 'stavanger': 'stavanger',
};

function resolveCitySlug(location) {
  const n = normalize(location);
  // Direct match against any alias
  for (const [alias, slug] of Object.entries(CITY_ALIASES)) {
    if (n.includes(normalize(alias))) return slug;
  }
  return null;
}

function buildResponse(entry, regionScope, location) {
  if (!entry) {
    return {
      success: true,
      data_available: false,
      location,
      message: 'Reliable local market data unavailable for this area.',
      methodology_url: '/methodology',
    };
  }

  const hasRent = entry.avg_rent_per_m2_monthly != null;
  return {
    success: true,
    data_available: true,
    location,
    region: { name: entry.name, scope: regionScope },
    currency: entry.currency,
    metrics: {
      avg_sale_per_m2: {
        value: entry.avg_sale_per_m2,
        unit: `${entry.currency}/m²`,
        source: entry.source,
        source_url: entry.source_url,
        last_updated: entry.last_updated,
        confidence: entry.confidence,
      },
      avg_rent_per_m2_monthly: hasRent
        ? {
            value: entry.avg_rent_per_m2_monthly,
            unit: `${entry.currency}/m²/mo`,
            source: entry.rent_source || entry.source,
            source_url: entry.rent_source_url || entry.source_url,
            last_updated: entry.rent_last_updated || entry.last_updated,
            confidence: entry.rent_confidence || entry.confidence,
          }
        : {
            value: null,
            unavailable_reason: entry.rent_unavailable_reason
              || 'No authoritative dataset bundled for this area yet.',
            confidence: 'unavailable',
          },
      appreciation_pct_yr: {
        value: entry.appreciation_pct_yr,
        unit: '%/yr',
        source: entry.source,
        source_url: entry.source_url,
        last_updated: entry.last_updated,
        confidence: entry.confidence,
      },
    },
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const { searchParams } = new URL(req.url);
  const location = (searchParams.get('location') || '').trim();
  const sqm = parseInt(searchParams.get('sqm')) || null;

  if (!location) {
    return new Response(JSON.stringify({ error: 'location parameter required' }), {
      status: 400,
      headers: CORS,
    });
  }

  // Geocode to country code (optional — we also accept country in query).
  let countryCode = (searchParams.get('country') || '').toUpperCase();
  if (!countryCode) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1&accept-language=en`,
        {
          headers: { 'User-Agent': 'NordInvest/1.0 (contact@nordinvest.io)' },
          signal: AbortSignal.timeout(5000),
        },
      );
      if (geoRes.ok) {
        const geo = await geoRes.json();
        countryCode = (geo[0]?.address?.country_code || '').toUpperCase();
      }
    } catch (_) {}
  }

  const bucketKey = COUNTRY_BUCKET[countryCode];
  if (!bucketKey) {
    return new Response(
      JSON.stringify(buildResponse(null, null, location)),
      { status: 200, headers: CORS },
    );
  }

  const bucket = marketStats[bucketKey];
  const citySlug = resolveCitySlug(location);

  let entry = null;
  let scope = null;
  if (citySlug && bucket[citySlug]) {
    entry = bucket[citySlug];
    scope = 'municipality';
  } else if (bucket._national) {
    entry = { ...bucket._national };
    // Downgrade confidence when used as a fallback
    entry.confidence = entry.confidence === 'high' ? 'medium' : entry.confidence;
    scope = 'national-fallback';
  }

  const body = buildResponse(entry, scope, location);

  // Optional: include derived "rent estimated for this sqm" only if we have
  // a real rent figure. We do not synthesize rent from yield assumptions.
  if (sqm && body.data_available && body.metrics.avg_rent_per_m2_monthly.value != null) {
    body.estimatedRentForSqm = Math.round(sqm * body.metrics.avg_rent_per_m2_monthly.value);
    body.sqmUsed = sqm;
  }

  return new Response(JSON.stringify(body), { status: 200, headers: CORS });
}
