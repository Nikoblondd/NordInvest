// Tinglyste salgspriser from Ejerfortegnelsen (EJF), joined with our own
// listing history on the BFE number.
//
// Why here and not on Vercel: EJF is protected data, and Datafordeler only
// serves it to the IP addresses registered on the IT-system. This Mac is that
// address (see the IT-system "NordInvest" on portal.datafordeler.dk).
//
// What it produces, per sold home we had listed: the tinglyst købesum and date,
// the last and first asking price, and the discount from asking to sale. Those
// rows are what lets NordInvest say "homes in 9670 sell 8 % under the last
// asking price" instead of guessing from asking prices.
//
// Runs once a day after a sweep. Without EJF access it logs once and stops;
// nothing else in the agent depends on it.

import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const GQL = "https://graphql.datafordeler.dk/FlexibleCurrent/v1";
const MONTHS_BACK = 24;

async function gql(query, variables) {
  const key = process.env.DATAFORDELER_API_KEY;
  if (!key) throw new Error("DATAFORDELER_API_KEY mangler i agent/.env");
  const res = await fetch(`${GQL}?apiKey=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(60_000),
  });
  const j = await res.json().catch(() => ({}));
  if (j?.errors?.length) {
    const msg = j.errors.map((e) => e.message).join("; ");
    const err = new Error(msg);
    err.unauthorized = /not authorized/i.test(msg);
    throw err;
  }
  return j.data;
}

// The date filter only accepts a literal (a variable of any date type is
// rejected), so `since` is written into the query; it is our own ISO date.
const HANDEL_Q = (since) => `query($t: DafDateTime!, $after: String) {
  EJF_Handelsoplysninger(first: 1000, after: $after, virkningstid: $t, where: { koebsaftaleDato: { gte: "${since}" } }) {
    pageInfo { hasNextPage endCursor }
    nodes { id_lokalId samletKoebesum kontantKoebesum koebsaftaleDato loesoeresum entreprisesum valutakode }
  }
}`;

const SKIFTE_Q = `query($t: DafDateTime!, $ids: [String!]) {
  EJF_Ejerskifte(first: 1000, virkningstid: $t, where: { handelsoplysningerLokalId: { in: $ids } }) {
    nodes { bestemtFastEjendomBFENr handelsoplysningerLokalId overdragelsesmaade overtagelsesdato }
  }
}`;

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * @param {{ log: (...a: unknown[]) => void, dataDir: string, supabase: { url: string, key: string } | null }} opts
 */
export async function syncSoldPrices({ log, dataDir, supabase }) {
  const stateFile = join(dataDir, "ejf-state.json");
  const state = existsSync(stateFile) ? JSON.parse(await readFile(stateFile, "utf8")) : {};
  if (state.lastRun && Date.now() - Date.parse(state.lastRun) < 20 * 3600_000) return; // once a day

  const t = new Date().toISOString();
  const since = new Date(Date.now() - MONTHS_BACK * 30.4 * 86400_000).toISOString();

  // 1) Every handel since `since`, page by page.
  const handler = new Map();
  let after = null;
  try {
    for (let page = 0; page < 400; page++) {
      const d = await gql(HANDEL_Q(since.slice(0, 10)), { t, after });
      const conn = d.EJF_Handelsoplysninger;
      for (const n of conn.nodes) handler.set(n.id_lokalId, n);
      if (!conn.pageInfo.hasNextPage) break;
      after = conn.pageInfo.endCursor;
    }
  } catch (e) {
    if (e.unauthorized) {
      log("[ejf] Ingen adgang til Ejerfortegnelsen endnu (afventer Geodatastyrelsen). Prøver igen i morgen.");
      await saveState(stateFile, { ...state, lastRun: t, lastStatus: "unauthorized" });
      return;
    }
    throw e;
  }

  // 2) The ejerskifte behind each handel: which BFE, how it changed hands.
  const ids = [...handler.keys()];
  const sales = [];
  for (let i = 0; i < ids.length; i += 200) {
    const d = await gql(SKIFTE_Q, { t, ids: ids.slice(i, i + 200) });
    for (const s of d.EJF_Ejerskifte.nodes) {
      const h = handler.get(s.handelsoplysningerLokalId);
      if (!h || !s.bestemtFastEjendomBFENr) continue;
      const price = Number(h.kontantKoebesum || h.samletKoebesum) - Number(h.loesoeresum || 0);
      if (!(price > 50_000) || (h.valutakode && h.valutakode !== "DKK")) continue;
      sales.push({
        bfe: Number(s.bestemtFastEjendomBFENr),
        price,
        date: String(h.koebsaftaleDato || s.overtagelsesdato || "").slice(0, 10),
        transfer: s.overdragelsesmaade ?? null,
        newBuild: Number(h.entreprisesum || 0) > 0,
      });
    }
  }

  // 3) Join with our own listings on BFE: zip, type, area and asking prices.
  const market = JSON.parse(await readFile(join(dataDir, "market.json"), "utf8"));
  const byBfe = new Map();
  for (const l of market.listings ?? []) if (l.bfe && l.market === "bolig") byBfe.set(Number(l.bfe), l);
  const rows = [];
  for (const s of sales) {
    const l = byBfe.get(s.bfe);
    if (!l || !l.area || s.newBuild) continue;
    const hist = Array.isArray(l.price_history) ? l.price_history : [];
    const firstAsk = hist[0]?.price ?? l.price;
    const lastAsk = l.price;
    // A sale long before we first saw the listing belongs to an earlier owner.
    if (l.first_seen && s.date && Date.parse(s.date) < Date.parse(l.first_seen) - 30 * 86400_000) continue;
    rows.push({
      bfe: s.bfe,
      zip: l.zip,
      type: l.type,
      area: Number(l.area),
      sale_price: Math.round(s.price),
      sale_date: s.date || null,
      transfer: s.transfer,
      last_asking: Math.round(lastAsk),
      first_asking: Math.round(firstAsk),
      discount_pct: lastAsk > 0 ? Math.round(((lastAsk - s.price) / lastAsk) * 1000) / 10 : null,
      price_m2: Math.round(s.price / Number(l.area)),
    });
  }

  // 4) Local file always; Supabase when the table exists.
  await mkdir(dataDir, { recursive: true });
  const tmp = join(dataDir, "sold.json.tmp");
  await writeFile(tmp, JSON.stringify({ updated: t, since, sales: rows }));
  await rename(tmp, join(dataDir, "sold.json"));
  const pushed = supabase ? await push(supabase, rows, log) : 0;
  const disc = median(rows.map((r) => r.discount_pct).filter((x) => x != null));
  log(`[ejf] ${handler.size} handler hentet, ${rows.length} matchet med vores annoncer${disc != null ? `, median afslag ${disc} %` : ""}${pushed ? `, ${pushed} gemt i Supabase` : ""}.`);
  await saveState(stateFile, { ...state, lastRun: t, lastStatus: "ok", handler: handler.size, matched: rows.length });
}

async function push({ url, key }, rows, log) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" };
  let n = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const res = await fetch(`${url}/rest/v1/sold_prices?on_conflict=bfe,sale_date`, { method: "POST", headers, body: JSON.stringify(rows.slice(i, i + 500)) });
    if (!res.ok) {
      log(`[ejf] Supabase: ${res.status} ${(await res.text()).slice(0, 160)} (er supabase/sold-prices-migration.sql kørt?)`);
      return n;
    }
    n += Math.min(500, rows.length - i);
  }
  return n;
}

async function saveState(file, s) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(s, null, 2));
}
