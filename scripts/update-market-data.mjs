#!/usr/bin/env node
/**
 * Update the bundled market-stats.json from official statistics agencies.
 *
 * Sources hit by this script:
 *   - Denmark: Danmarks Statistik (DST) JSON API   — table EJ55
 *       https://www.statbank.dk/EJ55
 *   - Sweden:  Statistics Sweden (SCB) PXWeb API   — Fastighetspriser BO0501
 *       https://www.scb.se/...
 *   - Norway:  Statistics Norway (SSB) PXWeb API   — table 06035
 *       https://www.ssb.no/en/statbank/table/06035
 *
 * Run quarterly:
 *     node scripts/update-market-data.mjs
 *
 * Honest defaults:
 *   - If an API call fails for a municipality, the existing JSON value
 *     is KEPT and the entry is flagged with `last_attempted` so we know
 *     why it didn't update. We never silently invent a number.
 *   - Rent-per-m² is left untouched — none of the agencies publish a
 *     direct per-m² monthly series. When a free authoritative feed
 *     exists, it can be added here.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '..', 'data', 'market-stats.json');

// ──────────────────────────────────────────────────────────────
// Denmark — Danmarks Statistik table EJ55
// EJ55 returns the realised sale price per m² by municipality and
// property type. We fetch apartments (BOLIGTYPE=EJ).
// ──────────────────────────────────────────────────────────────
async function fetchDST(muniCode) {
  const body = {
    table: 'EJ55',
    format: 'JSON',
    lang: 'en',
    variables: [
      { code: 'OMRÅDE',    values: [String(muniCode)] },
      { code: 'BOLIGTYPE', values: ['EJ'] },          // owner-occupied flat
      { code: 'ENHED',     values: ['AKT_KPRIS'] },   // realised price per m² (DKK)
      { code: 'Tid',       values: ['-1'] },          // latest quarter
    ],
  };
  const res = await fetch('https://api.statbank.dk/v1/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`DST ${muniCode}: HTTP ${res.status}`);
  const json = await res.json();
  const vals = json?.dataset?.value ?? json?.value ?? [];
  const flat = Array.isArray(vals) ? vals : Object.values(vals);
  const valid = flat.filter((v) => v != null && v > 5000);
  if (valid.length === 0) throw new Error(`DST ${muniCode}: no usable data`);
  return Math.round(valid[valid.length - 1]);
}

// ──────────────────────────────────────────────────────────────
// Norway — Statistics Norway PXWeb table 06035
// ──────────────────────────────────────────────────────────────
async function fetchSSB(regionCode) {
  const body = {
    query: [
      { code: 'Region',       selection: { filter: 'item', values: [regionCode] } },
      { code: 'Boligtype',    selection: { filter: 'item', values: ['02'] } }, // flats
      { code: 'ContentsCode', selection: { filter: 'item', values: ['KvadratmeterPris'] } },
      { code: 'Tid',          selection: { filter: 'top',  values: ['1'] } },
    ],
    response: { format: 'json-stat2' },
  };
  const res = await fetch('https://data.ssb.no/api/v0/en/table/06035', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`SSB ${regionCode}: HTTP ${res.status}`);
  const json = await res.json();
  const vals = Object.values(json?.value ?? {}).filter((v) => v != null && v > 0);
  if (vals.length === 0) throw new Error(`SSB ${regionCode}: no usable data`);
  return Math.round(vals[vals.length - 1]);
}

// ──────────────────────────────────────────────────────────────
// Sweden — Statistics Sweden PXWeb table BO0501T04 (Fastighetspriser)
// Schema is per-region; we look up the latest sek/m² for apartments.
// Falls back gracefully if the table is reorganized.
// ──────────────────────────────────────────────────────────────
async function fetchSCB(regionCode) {
  // SCB uses regional codes ("0114" for Stockholm county, etc.).
  // We attempt a minimal query and skip silently if it fails.
  const body = {
    query: [
      { code: 'Region', selection: { filter: 'item', values: [regionCode] } },
    ],
    response: { format: 'json' },
  };
  const url = 'https://api.scb.se/OV0104/v1/doris/en/ssd/START/BO/BO0501/BO0501A/FastpiPSRegAr';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`SCB ${regionCode}: HTTP ${res.status}`);
  const json = await res.json();
  const vals = (json?.data || []).map((d) => Number(d.values?.[0])).filter(Number.isFinite);
  if (vals.length === 0) throw new Error(`SCB ${regionCode}: no usable data`);
  return Math.round(vals[vals.length - 1]);
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────
async function main() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const db = JSON.parse(raw);
  const today = new Date().toISOString().slice(0, 10);
  const quarter = quarterStringFor(new Date());

  const log = { updated: [], kept: [], failed: [] };

  // Denmark
  for (const [slug, entry] of Object.entries(db.denmark)) {
    if (slug === '_national' || !entry.muni_code) continue;
    try {
      const price = await fetchDST(entry.muni_code);
      entry.avg_sale_per_m2 = price;
      entry.last_updated = quarter;
      entry.last_attempted = today;
      log.updated.push(`DK ${slug} → ${price}`);
    } catch (err) {
      entry.last_attempted = today;
      log.failed.push(`DK ${slug}: ${err.message}`);
    }
  }

  // Norway
  for (const [slug, entry] of Object.entries(db.norway)) {
    if (slug === '_national' || !entry.ssb_region) continue;
    try {
      const price = await fetchSSB(entry.ssb_region);
      entry.avg_sale_per_m2 = price;
      entry.last_updated = quarter;
      entry.last_attempted = today;
      log.updated.push(`NO ${slug} → ${price}`);
    } catch (err) {
      entry.last_attempted = today;
      log.failed.push(`NO ${slug}: ${err.message}`);
    }
  }

  // Sweden — SCB region codes are not in our slugs by default; only run
  // if `scb_region` is set on the entry. Otherwise skip and log.
  for (const [slug, entry] of Object.entries(db.sweden)) {
    if (slug === '_national') continue;
    if (!entry.scb_region) {
      log.kept.push(`SE ${slug}: no scb_region, kept ${entry.avg_sale_per_m2}`);
      continue;
    }
    try {
      const price = await fetchSCB(entry.scb_region);
      entry.avg_sale_per_m2 = price;
      entry.last_updated = quarter;
      entry.last_attempted = today;
      log.updated.push(`SE ${slug} → ${price}`);
    } catch (err) {
      entry.last_attempted = today;
      log.failed.push(`SE ${slug}: ${err.message}`);
    }
  }

  db._meta.generated_at = today;
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2) + '\n', 'utf8');

  console.log('\nMarket data refresh complete.');
  console.log(`Updated:   ${log.updated.length}`);
  for (const l of log.updated) console.log('  ✓', l);
  console.log(`Kept:      ${log.kept.length}`);
  for (const l of log.kept) console.log('  ·', l);
  console.log(`Failed:    ${log.failed.length}`);
  for (const l of log.failed) console.log('  ✗', l);
  console.log(`\nFile: ${DATA_FILE}`);
}

function quarterStringFor(d) {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

main().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
