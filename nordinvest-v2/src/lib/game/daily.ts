import { createHash } from "crypto";
import { buildGameSet, seededRng, type GameProperty } from "./listings";
import { accuracy, dailyScore } from "@/app/spil/gameLogic";

/*
 * "Dagens 5" — five homes that are the same for everyone in Denmark on a
 * given day, one attempt per player, and a shared leaderboard.
 *
 * Storage is Supabase Storage (bucket "game"), no table needed:
 *   daily/<date>/set.json                      the day's five homes
 *   daily/<date>/scores/<score>_<player>_<name>.json   one file per result
 * The score and name live in the file name, so the leaderboard is a single
 * sorted list call. Writes never overwrite, so two results can't clobber
 * each other and a player can only submit once per day.
 */

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "game";
export const DAILY_COUNT = 5;

export function dailyConfigured(): boolean {
  return Boolean(URL_BASE && KEY);
}

const headers = (extra: Record<string, string> = {}) => ({
  apikey: KEY!,
  Authorization: `Bearer ${KEY}`,
  ...extra,
});

/** Today's date in Denmark, YYYY-MM-DD. The daily set flips at midnight DK time. */
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(now);
}

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  await fetch(`${URL_BASE}/storage/v1/bucket`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  }).catch(() => null);
  bucketReady = true; // created now, or it already existed
}

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as T | null;
}

/** Writes once; returns false if the object already exists. */
async function putJson(path: string, data: unknown): Promise<boolean> {
  await ensureBucket();
  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json", "x-upsert": "false" }),
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function listNames(prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; offset < 5000; offset += 1000) {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      cache: "no-store",
      body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: "name", order: "desc" } }),
    });
    if (!res.ok) break;
    const rows = (await res.json().catch(() => [])) as { name?: string }[];
    for (const r of rows) if (r.name && r.name.endsWith(".json")) out.push(r.name);
    if (rows.length < 1000) break;
  }
  return out;
}

/* ---------------- the day's homes ---------------- */

const memo = new Map<string, GameProperty[]>();

export async function getDailySet(date: string): Promise<GameProperty[] | null> {
  const hit = memo.get(date);
  if (hit) return hit;
  const path = `daily/${date}/set.json`;
  const stored = await getJson<{ properties: GameProperty[] }>(path);
  if (stored?.properties?.length) {
    memo.set(date, stored.properties);
    return stored.properties;
  }
  // First visitor of the day builds it (seeded, so parallel builders agree
  // as far as Boligsiden allows); whoever writes first wins, the rest read it.
  for (const salt of ["", "-b", "-c"]) {
    const r = await buildGameSet("hele-dk", DAILY_COUNT, new Set(), seededRng(`nordinvest-daily-${date}${salt}`));
    if (!r.ok || r.properties.length < DAILY_COUNT) continue;
    const properties = r.properties.slice(0, DAILY_COUNT);
    const wrote = await putJson(path, { date, properties });
    if (!wrote) {
      const again = await getJson<{ properties: GameProperty[] }>(path);
      if (again?.properties?.length) {
        memo.set(date, again.properties);
        return again.properties;
      }
    }
    memo.set(date, properties);
    return properties;
  }
  return null;
}

/** What the browser gets before guessing: no price, no address, no listing link. */
export function publicHome(p: GameProperty) {
  return {
    id: p.id,
    area: p.area,
    rooms: p.rooms,
    yearBuilt: p.yearBuilt,
    energyLabel: p.energyLabel,
    monthlyExpenses: p.monthlyExpenses,
    typeLabel: p.typeLabel,
    city: p.city,
    zipCode: p.zipCode,
    images: p.images,
  };
}

/* ---------------- results & leaderboard ---------------- */

export type BoardEntry = { name: string; score: number; me?: boolean };

const playerHash = (clientId: string) => createHash("sha256").update(`ni-daily:${clientId}`).digest("hex").slice(0, 12);

export function cleanName(raw: unknown): string {
  const s = String(raw ?? "")
    .normalize("NFC")
    .replace(/[^A-Za-z0-9ÆØÅæøåÄÖÜäöüÉéÈèÁáÍíÓóÚú ._-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
  return s || "Anonym";
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => {
  try {
    return Buffer.from(s, "base64url").toString("utf8");
  } catch {
    return "?";
  }
};

function parseEntry(file: string): { score: number; player: string; name: string } | null {
  const m = /^(\d{4})_([0-9a-f]{12})_([A-Za-z0-9_-]*)\.json$/.exec(file);
  if (!m) return null;
  return { score: Number(m[1]), player: m[2], name: unb64(m[3]) };
}

export async function leaderboard(date: string, clientId?: string) {
  const files = await listNames(`daily/${date}/scores`);
  const entries = files.map(parseEntry).filter((e): e is NonNullable<typeof e> => !!e);
  entries.sort((a, b) => b.score - a.score);
  const mine = clientId ? playerHash(clientId) : null;
  const myIndex = mine ? entries.findIndex((e) => e.player === mine) : -1;
  // Rank = 1 + number of strictly better scores (ties share a rank).
  const rankOf = (score: number) => 1 + entries.filter((e) => e.score > score).length;
  return {
    total: entries.length,
    top: entries.slice(0, 20).map((e) => ({ name: e.name, score: e.score, me: e.player === mine })),
    me:
      myIndex >= 0
        ? { name: entries[myIndex].name, score: entries[myIndex].score, rank: rankOf(entries[myIndex].score) }
        : null,
    rankOf,
  };
}

export async function submitDaily(input: {
  date: string;
  clientId: string;
  name: string;
  guesses: number[];
  hints: number;
}) {
  const set = await getDailySet(input.date);
  if (!set) return { ok: false as const, error: "no_set" };
  const prices = set.map((p) => p.price);
  const guesses = prices.map((_, i) => Math.max(0, Math.floor(Number(input.guesses[i]) || 0)));
  const score = dailyScore(guesses, prices, input.hints);
  const squares = prices
    .map((p, i) => (guesses[i] > 0 ? accuracy((Math.abs(guesses[i] - p) / p) * 100).square : "⬜"))
    .join("");
  const player = playerHash(input.clientId);
  const name = cleanName(input.name);

  const already = (await listNames(`daily/${input.date}/scores`)).some((f) => f.includes(`_${player}_`));
  if (already) {
    const board = await leaderboard(input.date, input.clientId);
    return { ok: false as const, error: "already_played", score: board.me?.score ?? null, rank: board.me?.rank ?? null, total: board.total };
  }
  const file = `${String(score).padStart(4, "0")}_${player}_${b64(name)}.json`;
  await putJson(`daily/${input.date}/scores/${file}`, { name, score, squares, at: new Date().toISOString() });
  const board = await leaderboard(input.date, input.clientId);
  return { ok: true as const, score, squares, rank: board.rankOf(score), total: board.total };
}
