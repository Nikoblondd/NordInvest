"use client";

import { levelFor } from "./gameLogic";

/*
 * Everything the game remembers about a player lives in localStorage — no
 * login. Seen homes (so a home never repeats), finished games, XP, badges,
 * the daily streak and a random client id for the daily leaderboard.
 */

const SEEN_KEY = "ni_spil_seen_v1";
const HISTORY_KEY = "ni_spil_history_v1";
const PROFILE_KEY = "ni_spil_profile_v1";
const MAX_SEEN = 5000;

export type GameRecord = {
  at: string;
  region: string;
  rounds: number;
  players: { name: string; score: number }[];
};

export type Profile = {
  clientId: string;
  name: string;
  xp: number;
  badges: Record<string, string>; // id → ISO date unlocked
  streak: { count: number; last: string | null }; // daily-challenge streak
  daily: Record<string, { score: number; squares: string; rank?: number; total?: number }>;
  regions: string[];
  bestScore: number;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — the game still works, it just can't remember */
  }
}

/* ---------- seen homes ---------- */

export function loadSeen(): string[] {
  const v = readJson<unknown>(SEEN_KEY, []);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
export function markSeen(id: string): number {
  const seen = loadSeen();
  if (!seen.includes(id)) {
    seen.push(id);
    writeJson(SEEN_KEY, seen.slice(-MAX_SEEN));
  }
  return Math.min(seen.length, MAX_SEEN);
}

/* ---------- history ---------- */

export function loadHistory(): GameRecord[] {
  const v = readJson<unknown>(HISTORY_KEY, []);
  return Array.isArray(v) ? (v as GameRecord[]) : [];
}
export function pushHistory(r: GameRecord) {
  writeJson(HISTORY_KEY, [...loadHistory(), r].slice(-50));
}
export function resetHistory() {
  writeJson(SEEN_KEY, []);
  writeJson(HISTORY_KEY, []);
}

/* ---------- profile ---------- */

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function loadProfile(): Profile {
  const p = readJson<Partial<Profile>>(PROFILE_KEY, {});
  const profile: Profile = {
    clientId: typeof p.clientId === "string" ? p.clientId : newId(),
    name: typeof p.name === "string" ? p.name : "",
    xp: Number(p.xp) || 0,
    badges: p.badges && typeof p.badges === "object" ? p.badges : {},
    streak: p.streak && typeof p.streak === "object" ? p.streak : { count: 0, last: null },
    daily: p.daily && typeof p.daily === "object" ? p.daily : {},
    regions: Array.isArray(p.regions) ? p.regions : [],
    bestScore: Number(p.bestScore) || 0,
  };
  if (!p.clientId) writeJson(PROFILE_KEY, profile);
  return profile;
}
export function saveProfile(p: Profile) {
  writeJson(PROFILE_KEY, p);
}

/** Today's date in Denmark, YYYY-MM-DD (matches the server's daily key). */
export function todayDK(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(now);
}
function dayBefore(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
/** The streak is alive if the last daily was today or yesterday. */
export function liveStreak(p: Profile): number {
  const today = todayDK();
  return p.streak.last === today || p.streak.last === dayBefore(today) ? p.streak.count : 0;
}
export function bumpStreak(p: Profile): Profile {
  const today = todayDK();
  if (p.streak.last === today) return p;
  const count = p.streak.last === dayBefore(today) ? p.streak.count + 1 : 1;
  return { ...p, streak: { count, last: today } };
}

/** Milliseconds until midnight in Denmark — when the next daily unlocks. */
export function msToNextDaily(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? 0);
  const elapsed = (get("hour") * 3600 + get("minute") * 60 + get("second")) * 1000;
  return Math.max(0, 86_400_000 - elapsed);
}

/* ---------- badges ---------- */

export type BadgeId =
  | "first_game"
  | "spot_on"
  | "hat_trick"
  | "millionaire"
  | "no_hints"
  | "speedy"
  | "daily_done"
  | "streak3"
  | "streak7"
  | "top10"
  | "explorer"
  | "seen100";

export const BADGES: { id: BadgeId; title: string; how: string }[] = [
  { id: "first_game", title: "Første spil", how: "Spil et helt spil færdigt" },
  { id: "spot_on", title: "Plet på", how: "Gæt en pris inden for 1 %" },
  { id: "hat_trick", title: "Hattrick", how: "3 runder i træk inden for 5 %" },
  { id: "millionaire", title: "Millionærblik", how: "Inden for 5 % på en bolig over 5 mio." },
  { id: "no_hints", title: "Uden hjælp", how: "Et spil på 5+ runder uden hints" },
  { id: "speedy", title: "Lynhurtig", how: "Lås et gæt på under 10 sek. med tidspres" },
  { id: "daily_done", title: "Dagens 5", how: "Gennemfør dagens udfordring" },
  { id: "streak3", title: "3 dage i træk", how: "Spil Dagens 5 tre dage i træk" },
  { id: "streak7", title: "En hel uge", how: "Spil Dagens 5 syv dage i træk" },
  { id: "top10", title: "Top 10", how: "Kom i top 10 på dagens rangliste" },
  { id: "explorer", title: "Landet rundt", how: "Spil i 5 forskellige områder" },
  { id: "seen100", title: "100 boliger", how: "Se 100 forskellige boliger" },
];

/** Adds badges; returns the profile and the ones that are new. */
export function award(p: Profile, ids: BadgeId[]): { profile: Profile; fresh: BadgeId[] } {
  const fresh = ids.filter((id) => !p.badges[id]);
  if (!fresh.length) return { profile: p, fresh };
  const badges = { ...p.badges };
  const now = new Date().toISOString();
  for (const id of fresh) badges[id] = now;
  return { profile: { ...p, badges }, fresh };
}

/** Adds XP; returns whether the player reached a new level. */
export function addXp(p: Profile, xp: number): { profile: Profile; levelUp: string | null } {
  const before = levelFor(p.xp);
  const next = { ...p, xp: p.xp + Math.max(0, Math.round(xp)) };
  const after = levelFor(next.xp);
  return { profile: next, levelUp: after.level > before.level ? after.title : null };
}
