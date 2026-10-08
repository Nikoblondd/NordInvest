#!/usr/bin/env node
// ── NordInvest Market Agent ───────────────────────────────────────────────────
// One long-running local process that continuously scrapes the WHOLE Danish
// for-sale market (residential via Boligsiden's aggregator + investment/
// commercial via Ejendomstorvet), dedupes, detects new listings & price changes,
// marks delisted ones gone, and keeps NordInvest's dataset fresh.
//
// Start it once and leave it:   npm run agent      (or: node agent/index.mjs)
// Stop it with Ctrl-C — it finishes the current sweep and shuts down cleanly.
//
// Zero setup: with no keys it builds a local JSON index (agent/data/market.json).
// Add SUPABASE creds to agent/.env and it also write-through mirrors to the
// market_listings table. Add ANTHROPIC_API_KEY to enable auto-repair of a scraper
// if a portal changes its field names. See agent/README.md.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { PORTALS, paginate, sleep } from "./portals.mjs";
import { Store, logRun } from "./store.mjs";
import { attemptRepair } from "./repair.mjs";
import { buildReference } from "./reference.mjs";
import { syncSoldPrices } from "./ejf.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── tiny .env loader (no dependency) ─────────────────────────────────────────
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadEnv(join(HERE, ".env"));

// ── config ───────────────────────────────────────────────────────────────────
const CONFIG = {
  intervalMin: num(process.env.AGENT_INTERVAL_MIN, 20),
  maxPages: num(process.env.AGENT_MAX_PAGES, 0),          // 0 = unlimited (scrape everything)
  concurrency: Math.max(1, num(process.env.AGENT_CONCURRENCY, 6)), // parallel page fetches
  minListings: num(process.env.AGENT_MIN_LISTINGS, 0),    // warn if a sweep scrapes fewer than this
  requestDelayMs: num(process.env.AGENT_REQUEST_DELAY_MS, 200), // delay between parallel waves
  goneAfterHours: num(process.env.AGENT_GONE_AFTER_HOURS, 12),
  dataFile: process.env.AGENT_DATA_FILE || join(HERE, "data", "market.json"),
};
const SUPA =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? { url: process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY }
    : null;

function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function ts() { return new Date().toISOString().replace("T", " ").slice(0, 19); }
const log = {
  info: (...a) => console.log(ts(), ...a),
  warn: (...a) => console.warn(ts(), "⚠ ", ...a),
};

// ── graceful shutdown ────────────────────────────────────────────────────────
let stopping = false;
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (stopping) process.exit(0);
    stopping = true;
    log.info(`${sig} received — finishing current work, then exiting…`);
  });
}

// portal circuit breaker: back a portal off after repeated whole-sweep failures.
const fails = Object.fromEntries(PORTALS.map((p) => [p.name, 0]));

// ── one full sweep across every portal/task ───────────────────────────────────
async function sweep(store) {
  const startedAt = Date.now();
  const seen = new Set();
  const completedSources = new Set();
  const errors = [];
  let counts = { new: 0, price: 0, changed: 0, same: 0, usable: 0 };
  const newByMarket = { bolig: 0, investering: 0 };
  log.info("▶ starter markedsgennemløb…");

  for (const portal of PORTALS) {
    if (fails[portal.name] >= 3 && Date.now() % 3 !== 0) {
      // crude cooldown: after 3 consecutive failures, mostly skip until it recovers
      log.warn(`${portal.name}: in cooldown after repeated failures — skipping this sweep`);
      continue;
    }
    let portalOk = true;

    for (const task of portal.tasks()) {
      if (stopping) break;
      log.info(`  ↳ scanner ${task.label}…`);

      const { listings, rowsSeen, sample, hardFail, shapeChanged } = await paginate(task, {
        maxPages: CONFIG.maxPages,
        concurrency: CONFIG.concurrency,
        delayMs: CONFIG.requestDelayMs,
      });

      let usable = 0;
      for (const norm of listings) {
        usable++;
        const id = `${norm.source}:${norm.externalId}`;
        seen.add(id);
        const kind = store.upsert(norm);
        counts[kind]++;
        if (kind === "new") newByMarket[norm.market] = (newByMarket[norm.market] || 0) + 1;
      }
      counts.usable += usable;
      log.info(`${task.label}: ${rowsSeen} annoncer scannet, ${usable} brugbare`);

      if (shapeChanged) { log.warn(`${task.label}: svar-format ændret (ingen liste)`); errors.push(`${task.label}:shape`); portalOk = false; }
      // schema-drift: rows came back but almost none parsed → field names broke.
      if (rowsSeen > 0 && usable === 0 && sample) {
        log.warn(`${task.label}: 0 brugbare af ${rowsSeen} — sandsynligvis omdøbte felter. Forsøger selv-reparation…`);
        errors.push(`${task.label}:drift`);
        await attemptRepair(portal.name, sample, log); // helps the NEXT sweep
        portalOk = false;
      }
      if (hardFail) { errors.push(`${task.label}:fetch`); portalOk = false; }
    }

    if (portalOk) { completedSources.add(portalSource(portal)); fails[portal.name] = 0; }
    else fails[portal.name]++;
  }

  const gone = store.markGone(seen, completedSources, CONFIG.goneAfterHours);
  const { pushed } = await store.persist();

  // Rebuild the documented reference benchmarks (price/m², erhverv) from the
  // freshly-synced market, so public/reference.json + the analyzer stay current.
  // Best-effort: a failure here never fails the sweep.
  if (SUPA) {
    try { await buildReference({ log: log.info }); }
    catch (e) { log.warn(`referencedata-opdatering sprang over: ${e?.message || e}`); }
  }

  // Tinglyste salgspriser from Ejerfortegnelsen, once a day. Needs EJF access on
  // the IT-system and this Mac's IP registered there; without it, it logs once.
  if (process.env.DATAFORDELER_API_KEY) {
    try { await syncSoldPrices({ log: log.info, dataDir: dirname(CONFIG.dataFile), supabase: SUPA }); }
    catch (e) { log.warn(`salgspriser (EJF) sprang over: ${e?.message || e}`); }
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);

  // minimum-listings requirement: warn loudly if a sweep came up short
  if (CONFIG.minListings > 0 && seen.size < CONFIG.minListings) {
    log.warn(`KUN ${seen.size} annoncer scannet — under dit minimumskrav på ${CONFIG.minListings}. Tjek advarsler/kilder ovenfor.`);
    errors.push(`under_minimum:${seen.size}/${CONFIG.minListings}`);
  }

  const byMarket = store.countByMarket();
  const sources = PORTALS.map((p) => `${p.name} ${completedSources.has(p.name) ? "✓" : "✗"}`).join(" · ");
  const syncLine = SUPA
    ? (pushed ? `→ synkroniseret ${pushed} ændringer LIVE til NordInvest ✓` : "ingen ændringer at synkronisere")
    : "lokal kun (tilføj Supabase-nøgle for at gå live)";

  const summary = [
    "",
    "════════ OPSUMMERING ════════",
    `Tidspunkt:   ${ts()}  (gennemløb tog ${elapsed}s)`,
    `Scannet:     ${seen.size} annoncer`,
    `Nye:         ${counts.new}  (boliger ${newByMarket.bolig || 0} · erhverv ${newByMarket.investering || 0})`,
    `Prisændringer: ${counts.price}   ·   Redigeret: ${counts.changed}   ·   Fjernet: ${gone}`,
    `Marked i alt: ${store.activeCount} aktive  (boliger ${byMarket.bolig || 0} · erhverv ${byMarket.investering || 0})`,
    `Kilder:      ${sources}`,
    `NordInvest:  ${syncLine}`,
    errors.length ? `Advarsler:   ${errors.join(", ")}` : `Advarsler:   ingen`,
    "═════════════════════════════",
    "",
  ].join("\n");
  console.log(summary);

  // also drop the latest summary to a file you can tail/open anytime
  try {
    await mkdir(dirname(CONFIG.dataFile), { recursive: true });
    await writeFile(join(dirname(CONFIG.dataFile), "last-summary.txt"), summary.trim() + "\n");
  } catch { /* best-effort */ }

  await logRun(SUPA || {}, {
    finished_at: new Date().toISOString(), ok: errors.length === 0,
    seen: seen.size, new_count: counts.new, changed: counts.price + counts.changed, gone,
    errors: errors.length ? errors : null,
    note: `active=${store.activeCount} total=${store.size} pushed=${pushed} boliger=${byMarket.bolig || 0} erhverv=${byMarket.investering || 0}`,
  });
  return counts;
}

function portalSource(portal) {
  // portal.name === the `source` string used by its normalisers
  return portal.name;
}

// ── main loop ─────────────────────────────────────────────────────────────────
async function main() {
  log.info("NordInvest Market Agent starting.");
  log.info(`mode: ${SUPA ? "Supabase sync + local cache" : "LOCAL ONLY (add SUPABASE creds to agent/.env to sync)"}`);
  log.info(`config: interval=${CONFIG.intervalMin}min maxPages=${CONFIG.maxPages === 0 ? "∞ (alt)" : CONFIG.maxPages} parallel=${CONFIG.concurrency} minKrav=${CONFIG.minListings || "—"}`);
  log.info(`data file: ${CONFIG.dataFile}`);
  if (process.env.ANTHROPIC_API_KEY) log.info("self-repair: ENABLED");

  const store = new Store({ file: CONFIG.dataFile, supabase: SUPA });
  await store.load();
  log.info(`loaded ${store.size} known listings from local index.`);

  while (!stopping) {
    const started = Date.now();
    try {
      await sweep(store);
    } catch (e) {
      log.warn(`sweep crashed (recovering): ${e?.stack || e}`);
      try { await store.persist(); } catch { /* ignore */ }
    }
    if (stopping) break;
    const elapsed = Math.round((Date.now() - started) / 1000);
    const waitMs = Math.max(15000, CONFIG.intervalMin * 60000 - elapsed * 1000);
    log.info(`next sweep in ${Math.round(waitMs / 1000)}s (last took ${elapsed}s). Ctrl-C to stop.`);
    // interruptible wait
    const until = Date.now() + waitMs;
    while (Date.now() < until && !stopping) await sleep(1000);
  }

  log.info("shutting down — persisting final state…");
  try { await store.persist(); } catch { /* ignore */ }
  log.info("stopped cleanly. 👋");
  process.exit(0);
}

main().catch((e) => { log.warn(`fatal: ${e?.stack || e}`); process.exit(1); });
