// Storage + dedupe + change detection for the agent.
//
// The local JSON file is always the working set (fast, zero-setup, survives
// restarts). If SUPABASE credentials are present it ALSO write-through mirrors
// every changed row into public.market_listings so the live NordInvest DB stays
// fresh. Start with no DB and it just builds the local index; add the key later
// and it starts syncing — nothing else changes.

import { createHash } from "node:crypto";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

const today = () => new Date().toISOString().slice(0, 10);

// hash of the identity-ish fields (everything but price + timestamps) so a pure
// price move is classified separately from a content edit.
/** The day a home was listed, from its days on the market (midnight UTC, so it is the same every sweep). */
function listedAt(days) {
  if (!Number.isFinite(days) || days < 0 || days > 3650) return null;
  const d = new Date(); d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - days * 86400_000).toISOString();
}

function contentHash(l) {
  const s = JSON.stringify([
    l.address, l.road, l.zip, l.city, l.type, l.subcategory,
    l.area, l.rooms, l.yearBuilt, l.energyLabel, l.image, l.url,
    l.returnPercent, l.operatingCost,
  ]);
  return createHash("sha1").update(s).digest("hex").slice(0, 16);
}

export class Store {
  constructor({ file, supabase }) {
    this.file = file;
    this.supabase = supabase || null; // { url, key }
    this.map = new Map();             // id -> record
    this.dirty = new Set();           // ids to push to DB
  }

  async load() {
    if (existsSync(this.file)) {
      try {
        const raw = JSON.parse(await readFile(this.file, "utf8"));
        for (const rec of raw.listings || []) this.map.set(rec.id, rec);
      } catch {
        /* corrupt/empty file → start fresh */
      }
    }
  }

  // Classify one normalised listing. Returns 'new' | 'price' | 'changed' | 'same'.
  upsert(l) {
    const id = `${l.source}:${l.externalId}`;
    const now = new Date().toISOString();
    const hash = contentHash(l);
    const prev = this.map.get(id);

    // first_seen is when the home came on the market: the portal's own count of days
    // on the market when it gives one, else the first time we saw it.
    const listed = listedAt(l.daysOnMarket);

    if (!prev) {
      this.map.set(id, {
        id, ...l, content_hash: hash, status: "active",
        price_history: [{ d: today(), price: l.price }],
        first_seen: listed && listed < now ? listed : now, last_seen: now, updated_at: now,
      });
      this.dirty.add(id);
      return "new";
    }

    let kind = "same";
    const rec = { ...prev, ...l, id, content_hash: hash, last_seen: now };

    if (prev.price !== l.price && Number.isFinite(l.price)) {
      kind = "price";
      rec.status = "price_changed";
      const hist = Array.isArray(prev.price_history) ? prev.price_history.slice() : [];
      if (hist[hist.length - 1]?.price !== l.price) hist.push({ d: today(), price: l.price });
      rec.price_history = hist.slice(-60);
      rec.updated_at = now;
    } else if (prev.content_hash !== hash) {
      kind = "changed";
      rec.status = prev.status === "gone" ? "active" : prev.status || "active";
      rec.updated_at = now;
    } else if (prev.status === "gone") {
      // it came back
      rec.status = "active";
      rec.updated_at = now;
      kind = "changed";
    }

    // Homes we first met in a sweep long after they were listed get their real listing date (once).
    if (listed && Date.parse(listed) < Date.parse(prev.first_seen) - 86400_000) rec.first_seen = listed;

    this.map.set(id, rec);
    if (kind !== "same" || rec.first_seen !== prev.first_seen) this.dirty.add(id);
    else this.map.get(id).last_seen = now; // keep it alive without marking dirty
    return kind;
  }

  // Mark listings we DIDN'T see this sweep as gone (delisted/sold) once they've
  // been missing past the cutoff, so a single flaky sweep never wipes the index.
  markGone(seenIds, completedSources, maxAgeHours = 12) {
    const cutoff = Date.now() - maxAgeHours * 3600 * 1000;
    let gone = 0;
    for (const [id, rec] of this.map) {
      if (seenIds.has(id) || rec.status === "gone") continue;
      // never mark gone within a source whose sweep failed this cycle
      if (completedSources && !completedSources.has(rec.source)) continue;
      if (new Date(rec.last_seen).getTime() < cutoff) {
        rec.status = "gone";
        rec.updated_at = new Date().toISOString();
        this.dirty.add(id);
        gone++;
      }
    }
    return gone;
  }

  get size() { return this.map.size; }
  get activeCount() { let n = 0; for (const r of this.map.values()) if (r.status !== "gone") n++; return n; }

  countByMarket() {
    const out = { bolig: 0, investering: 0 };
    for (const r of this.map.values()) {
      if (r.status === "gone") continue;
      out[r.market] = (out[r.market] || 0) + 1;
    }
    return out;
  }

  async persist() {
    // 1) local file (atomic write)
    await mkdir(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await writeFile(tmp, JSON.stringify({ updated: new Date().toISOString(), listings: [...this.map.values()] }));
    await rename(tmp, this.file);

    // 2) optional Supabase mirror (only the dirty rows)
    if (this.supabase && this.dirty.size) {
      const rows = [...this.dirty].map((id) => toDbRow(this.map.get(id))).filter(Boolean);
      const pushed = await pushSupabase(this.supabase, rows);
      if (pushed) this.dirty.clear();
      return { pushed: pushed ? rows.length : 0 };
    }
    return { pushed: 0 };
  }
}

function toDbRow(r) {
  if (!r) return null;
  return {
    id: r.id, source: r.source, market: r.market, external_id: String(r.externalId),
    url: r.url, address: r.address, road: r.road, zip: r.zip || null, city: r.city,
    municipality: r.municipality ?? null, region: r.region ?? null,
    type: r.type, subcategory: r.subcategory, price: Math.round(r.price),
    area: r.area, rooms: r.rooms, year_built: r.yearBuilt, energy_label: r.energyLabel,
    return_percent: r.returnPercent, operating_cost: r.operatingCost,
    image: r.image, lat: r.lat, lon: r.lon, content_hash: r.content_hash,
    status: r.status, price_history: r.price_history,
    first_seen: r.first_seen, last_seen: r.last_seen, updated_at: r.updated_at,
  };
}

async function pushSupabase({ url, key }, rows) {
  const endpoint = `${url}/rest/v1/market_listings?on_conflict=id`;
  const headers = {
    apikey: key, Authorization: `Bearer ${key}`,
    "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal",
  };
  // batch to stay well under payload limits
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    try {
      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(chunk) });
      if (!res.ok) {
        console.warn(`[store] Supabase upsert ${res.status}: ${(await res.text()).slice(0, 200)}`);
        return false;
      }
    } catch (e) {
      console.warn(`[store] Supabase upsert failed: ${e}`);
      return false;
    }
  }
  return true;
}

export async function logRun({ url, key }, run) {
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/agent_runs`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify([run]),
    });
  } catch { /* health logging is best-effort */ }
}
