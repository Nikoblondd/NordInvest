import { MUNICIPALITIES } from "@/lib/kommuner";

/*
 * Search agents: a member's own standing searches on the whole market. Each
 * agent has criteria (the Deal-motor's own filters), a schedule (every day,
 * on weekdays or once a week, at an hour the member picks, Danish time) and
 * an e-mail switch. When it runs it keeps the listings it has already seen,
 * so only new ones are reported. Shared by the app (client) and the runner.
 */

export type Market = "bolig" | "investering";
export type Freq = "daily" | "weekdays" | "weekly";

export type Criteria = {
  market: Market;
  /** Kommune slugs; empty means the whole country. */
  municipalities: string[];
  /** Boligsiden type id for homes ("condo", "villa", "terraced house", "cooperative"). */
  type: string;
  priceMin: number | null;
  priceMax: number | null;
  areaMin: number | null;
  roomsMin: number | null;
  minScore: number | null;
  minYield: number | null;
  minCashflow: number | null;
  /** Investment subcategory, e.g. "Boligudlejning". */
  subcat: string | null;
};

export type Schedule = { freq: Freq; hour: number; weekday: number };

export type HitStatus = "ny" | "set" | "gemt" | "afvist";
export type Hit = {
  id: string;
  foundAt: string;
  /** True when it came in after the agent was created (not part of the first scan). */
  fresh: boolean;
  status: HitStatus;
  savedId?: string;
  address: string;
  road: string;
  zip: number;
  city: string;
  price: number;
  area: number | null;
  rooms: number | null;
  score: number;
  cashFlow: number;
  capRate: number;
  rent: number | null;
  image: string | null;
  url: string;
  source: string;
  href: string;
  priceChangePct: number | null;
};

export type Run = { at: string; matches: number; fresh: number; emailed: boolean; ok: boolean };

export type Agent = {
  id: string;
  name: string;
  active: boolean;
  criteria: Criteria;
  schedule: Schedule;
  email: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  seen: string[];
  runs: Run[];
  hits: Hit[];
};

export const MAX_AGENTS = 12;
export const MAX_HITS = 80;

export const TYPES = [
  { id: "condo", label: "Ejerlejlighed" },
  { id: "villa", label: "Villa" },
  { id: "terraced house", label: "Rækkehus" },
  { id: "cooperative", label: "Andelsbolig" },
];
export const SUBCATS = ["Boligudlejning", "Kontor", "Detailhandel & butik", "Lager & produktion", "Hotel & restaurant", "Andre typer", "Grunde"];
export const WEEKDAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
export const FREQ_LABEL: Record<Freq, string> = { daily: "Hver dag", weekdays: "Hverdage", weekly: "En gang om ugen" };

export const EMPTY_CRITERIA: Criteria = {
  market: "bolig", municipalities: [], type: "condo", priceMin: null, priceMax: 3000000, areaMin: null, roomsMin: null,
  minScore: null, minYield: null, minCashflow: null, subcat: null,
};

export const muniName = (slug: string) => MUNICIPALITIES.find((m) => m.slug === slug)?.name ?? slug;
const mio = (n: number) => `${(n / 1e6).toLocaleString("da-DK", { maximumFractionDigits: 1 })} mio.`;

/** A name that says what the agent looks for, e.g. "Ejerlejlighed i Aarhus under 2,5 mio." */
export function suggestName(c: Criteria): string {
  const what = c.market === "investering" ? (c.subcat ?? "Erhverv") : (TYPES.find((t) => t.id === c.type)?.label ?? "Bolig");
  const where = c.municipalities.length === 0 ? "hele landet" : c.municipalities.length <= 2 ? c.municipalities.map(muniName).join(" og ") : `${muniName(c.municipalities[0])} og ${c.municipalities.length - 1} andre`;
  return `${what} i ${where}${c.priceMax ? ` under ${mio(c.priceMax)}` : ""}`;
}

/** The criteria as short chips for cards and mails. */
export function criteriaChips(c: Criteria): string[] {
  const out: string[] = [];
  out.push(c.market === "investering" ? (c.subcat ?? "Erhverv") : (TYPES.find((t) => t.id === c.type)?.label ?? "Bolig"));
  out.push(c.municipalities.length === 0 ? "Hele landet" : c.municipalities.map(muniName).join(", "));
  if (c.priceMin && c.priceMax) out.push(`${mio(c.priceMin)} til ${mio(c.priceMax)} kr.`);
  else if (c.priceMax) out.push(`Under ${mio(c.priceMax)} kr.`);
  else if (c.priceMin) out.push(`Over ${mio(c.priceMin)} kr.`);
  if (c.areaMin) out.push(`Mindst ${c.areaMin} m²`);
  if (c.roomsMin) out.push(`Mindst ${c.roomsMin} vær.`);
  if (c.minScore) out.push(`Score ${c.minScore}+`);
  if (c.minYield) out.push(`Afkast ${c.minYield.toLocaleString("da-DK")} %+`);
  if (c.minCashflow != null) out.push(`Cash flow ${c.minCashflow >= 0 ? "+" : ""}${c.minCashflow.toLocaleString("da-DK")} kr./md.+`);
  return out;
}

export function scheduleLabel(s: Schedule): string {
  const at = `kl. ${String(s.hour).padStart(2, "0")}.00`;
  return s.freq === "weekly" ? `Hver ${WEEKDAYS[s.weekday]} ${at}` : `${FREQ_LABEL[s.freq]} ${at}`;
}

/** The Deal-motor search query for these criteria. */
export function searchParams(c: Criteria): URLSearchParams {
  const q = new URLSearchParams({ market: c.market, sort: "score", strategy: "cashflow", limit: "100" });
  if (c.municipalities.length) q.set("municipality", c.municipalities.join(",")); else q.set("all", "1");
  if (c.market === "bolig") q.set("type", c.type || "condo");
  const put = (k: string, v: number | null) => { if (v != null && Number.isFinite(v)) q.set(k, String(v)); };
  put("priceMin", c.priceMin); put("priceMax", c.priceMax); put("areaMin", c.areaMin); put("roomsMin", c.roomsMin);
  put("minScore", c.minScore); put("minYield", c.minYield); put("minCashflow", c.minCashflow);
  if (c.market === "investering" && c.subcat) q.set("subcat", c.subcat);
  return q;
}

/* ---------- Danish time ---------- */

/** Minutes Copenhagen is ahead of UTC at this instant (60 in winter, 120 in summer). */
function cphOffset(at: Date): number {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Copenhagen", timeZoneName: "shortOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = part.match(/GMT([+-]\d+)(?::(\d+))?/);
  return m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : 60;
}

/** Year, month, day and weekday of a moment in Copenhagen. */
function cphDate(at: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Copenhagen", year: "numeric", month: "numeric", day: "numeric", weekday: "short" }).formatToParts(at).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday) };
}

/** The next time this schedule fires after `now`, as an ISO string (UTC). */
export function nextRun(s: Schedule, now = new Date()): string {
  const base = cphDate(now);
  for (let i = 0; i < 9; i++) {
    const day = new Date(Date.UTC(base.y, base.m - 1, base.d + i, 12));
    const wd = day.getUTCDay();
    if (s.freq === "weekdays" && (wd === 0 || wd === 6)) continue;
    if (s.freq === "weekly" && wd !== s.weekday) continue;
    const guess = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), s.hour, 0);
    const at = new Date(guess - cphOffset(new Date(guess)) * 60000);
    if (at.getTime() > now.getTime() + 60000) return at.toISOString();
  }
  return new Date(now.getTime() + 86400000).toISOString();
}

/** "i dag kl. 07.00", "i morgen kl. 07.00" or "fre. 17. okt. kl. 07.00". */
export function whenLabel(iso: string | null, now = new Date()): string {
  if (!iso) return "Ikke planlagt";
  const at = new Date(iso);
  const a = cphDate(at), b = cphDate(now);
  const days = Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86400000);
  const time = at.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" });
  if (days === 0) return `i dag kl. ${time}`;
  if (days === 1) return `i morgen kl. ${time}`;
  if (days === -1) return `i går kl. ${time}`;
  return `${at.toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Copenhagen" })} kl. ${time}`;
}

/** Cleans criteria from the client: only known fields, sane numbers. */
export function cleanCriteria(raw: unknown): Criteria {
  const r = (raw ?? {}) as Record<string, unknown>;
  const n = (v: unknown, min: number, max: number) => {
    const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
    return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x * 100) / 100)) : null;
  };
  const slugs = new Set(MUNICIPALITIES.map((m) => m.slug));
  const market: Market = r.market === "investering" ? "investering" : "bolig";
  return {
    market,
    municipalities: Array.isArray(r.municipalities) ? Array.from(new Set(r.municipalities.filter((s): s is string => typeof s === "string" && slugs.has(s)))).slice(0, 30) : [],
    type: TYPES.some((t) => t.id === r.type) ? String(r.type) : "condo",
    priceMin: n(r.priceMin, 0, 1e9),
    priceMax: n(r.priceMax, 0, 1e9),
    areaMin: n(r.areaMin, 0, 100000),
    roomsMin: n(r.roomsMin, 0, 50),
    minScore: n(r.minScore, 0, 100),
    minYield: n(r.minYield, -50, 50),
    minCashflow: n(r.minCashflow, -1e6, 1e6),
    subcat: market === "investering" && typeof r.subcat === "string" && SUBCATS.includes(r.subcat) ? r.subcat : null,
  };
}

export function cleanSchedule(raw: unknown): Schedule {
  const r = (raw ?? {}) as Record<string, unknown>;
  const freq: Freq = r.freq === "weekdays" || r.freq === "weekly" ? r.freq : "daily";
  const hour = Number.isInteger(r.hour) && (r.hour as number) >= 5 && (r.hour as number) <= 22 ? (r.hour as number) : 7;
  const weekday = Number.isInteger(r.weekday) && (r.weekday as number) >= 0 && (r.weekday as number) <= 6 ? (r.weekday as number) : 1;
  return { freq, hour, weekday };
}
