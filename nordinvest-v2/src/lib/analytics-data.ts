// Business metrics for the admin analytics dashboard — computed from our OWN
// Supabase data (profiles + analyses), so they're exact, free, need no third
// party, and don't touch the GDPR/cookie story. Anonymous top-of-funnel traffic
// (visitors, clicks) comes from Vercel Web Analytics separately.
import { tiers } from "@/lib/pricing";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PAID = ["starter", "plus", "pro", "unlimited"] as const;
const priceOf = (tier: string) => tiers.find((t) => t.id === tier)?.price ?? 0;

function headers() {
  return { apikey: KEY as string, Authorization: `Bearer ${KEY}` };
}

// Exact row count via PostgREST (works past the 1000-row page cap).
async function count(table: string, filters = ""): Promise<number> {
  if (!URL_BASE || !KEY) return 0;
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/${table}?select=id${filters}`, {
      method: "HEAD",
      headers: { ...headers(), Prefer: "count=exact", Range: "0-0" },
      cache: "no-store",
    });
    const cr = res.headers.get("content-range"); // "0-0/123" or "*/123"
    return cr ? Number(cr.split("/")[1]) || 0 : 0;
  } catch {
    return 0;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function rows(table: string, query: string): Promise<any[]> {
  if (!URL_BASE || !KEY) return [];
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/${table}?${query}`, { headers: headers(), cache: "no-store" });
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

function median(nums: number[]): number | null {
  const xs = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = xs.length >> 1;
  return xs.length % 2 ? xs[mid] : Math.round((xs[mid - 1] + xs[mid]) / 2);
}

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();
const dayKey = (ts: string) => ts.slice(0, 10);

export type DayPoint = { date: string; signups: number; analyses: number };

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tier: string;
  createdAt: string;
  analyses: number;
};

export type TimeSavings = {
  responses: number;
  medianManualMinutes: number | null;
  matched: number; // "tallene passede"
  minor: number; // rettede småting
  major: number; // store afvigelser
};

export type Analytics = {
  configured: boolean;
  timeSavings: TimeSavings;
  totalUsers: number;
  newUsers7: number;
  newUsers30: number;
  payingUsers: number;
  conversionPct: number; // paying / total
  mrr: number; // kr/md
  arr: number; // kr/år
  tierBreakdown: { tier: string; name: string; price: number; count: number; mrr: number }[];
  totalAnalyses: number;
  analyses7: number;
  analyses30: number;
  activeUsers7: number;
  activeUsers30: number;
  watches: number;
  savedSearches: number;
  series: DayPoint[]; // last 30 days
  users: UserRow[]; // full list for the "Brugere" tab
};

export async function getAnalytics(): Promise<Analytics> {
  const EMPTY_TS: TimeSavings = { responses: 0, medianManualMinutes: null, matched: 0, minor: 0, major: 0 };
  if (!URL_BASE || !KEY) {
    return {
      configured: false, timeSavings: EMPTY_TS, totalUsers: 0, newUsers7: 0, newUsers30: 0, payingUsers: 0, conversionPct: 0,
      mrr: 0, arr: 0, tierBreakdown: [], totalAnalyses: 0, analyses7: 0, analyses30: 0,
      activeUsers7: 0, activeUsers30: 0, watches: 0, savedSearches: 0, series: [], users: [],
    };
  }

  const [
    totalUsers, newUsers7, newUsers30, payingUsers,
    totalAnalyses, analyses7, analyses30, watches, savedSearches,
    profileRows, analysisRows, allAnalysisRows, feedbackRows,
  ] = await Promise.all([
    count("profiles"),
    count("profiles", `&created_at=gte.${iso(7)}`),
    count("profiles", `&created_at=gte.${iso(30)}`),
    count("profiles", `&subscription_tier=in.(${PAID.join(",")})`),
    count("analyses"),
    count("analyses", `&created_at=gte.${iso(7)}`),
    count("analyses", `&created_at=gte.${iso(30)}`),
    count("watches"),
    count("saved_searches"),
    rows("profiles", `select=id,full_name,email,phone,subscription_tier,created_at&order=created_at.desc&limit=100000`),
    rows("analyses", `select=user_id,created_at&created_at=gte.${iso(30)}&order=created_at.asc&limit=100000`),
    rows("analyses", `select=user_id&limit=100000`),
    rows("analyses", `select=property_data&order=created_at.desc&limit=5000`),
  ]);

  // Tier breakdown + MRR (from the fetched profile rows).
  const tierCount: Record<string, number> = {};
  for (const r of profileRows) tierCount[r.subscription_tier ?? "free"] = (tierCount[r.subscription_tier ?? "free"] ?? 0) + 1;
  const tierBreakdown = PAID.map((t) => ({
    tier: t,
    name: tiers.find((x) => x.id === t)?.name ?? t,
    price: priceOf(t),
    count: tierCount[t] ?? 0,
    mrr: (tierCount[t] ?? 0) * priceOf(t),
  }));
  const mrr = tierBreakdown.reduce((s, t) => s + t.mrr, 0);

  // Active users (distinct user_id who ran an analysis in the window).
  const active7 = new Set<string>();
  const active30 = new Set<string>();
  const cut7 = iso(7);
  for (const r of analysisRows) {
    if (!r.user_id) continue;
    active30.add(r.user_id);
    if (r.created_at >= cut7) active7.add(r.user_id);
  }

  // 30-day daily series (signups + analyses).
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) days.push(dayKey(iso(i)));
  const signupByDay: Record<string, number> = {};
  const cut30 = iso(30);
  for (const r of profileRows) {
    if (r.created_at && r.created_at >= cut30) signupByDay[dayKey(r.created_at)] = (signupByDay[dayKey(r.created_at)] ?? 0) + 1;
  }
  const analysisByDay: Record<string, number> = {};
  for (const r of analysisRows) analysisByDay[dayKey(r.created_at)] = (analysisByDay[dayKey(r.created_at)] ?? 0) + 1;
  const series: DayPoint[] = days.map((d) => ({ date: d, signups: signupByDay[d] ?? 0, analyses: analysisByDay[d] ?? 0 }));

  // Per-user analysis counts (from ALL analyses) for the Brugere list.
  const perUser: Record<string, number> = {};
  for (const r of allAnalysisRows) if (r.user_id) perUser[r.user_id] = (perUser[r.user_id] ?? 0) + 1;
  const users: UserRow[] = profileRows.map((r) => ({
    id: r.id,
    name: r.full_name || "(uden navn)",
    email: r.email || "",
    phone: r.phone || null,
    tier: r.subscription_tier || "free",
    createdAt: r.created_at || "",
    analyses: perUser[r.id] ?? 0,
  }));

  // Time-savings survey (stored on analyses.property_data.feedback) — the
  // decisive validation evidence: how much time the tool saves + whether the
  // numbers held up.
  const manual: number[] = [];
  const ts = { matched: 0, minor: 0, major: 0 };
  for (const r of feedbackRows) {
    const fb = (r.property_data && (r.property_data as any).feedback) as
      | { manualMinutes?: number; accuracy?: string }
      | undefined;
    if (!fb) continue;
    if (Number.isFinite(fb.manualMinutes)) manual.push(Number(fb.manualMinutes));
    if (fb.accuracy === "matched" || fb.accuracy === "minor" || fb.accuracy === "major") ts[fb.accuracy]++;
  }
  const timeSavings: TimeSavings = {
    responses: manual.length,
    medianManualMinutes: median(manual),
    matched: ts.matched, minor: ts.minor, major: ts.major,
  };

  return {
    configured: true,
    timeSavings,
    totalUsers, newUsers7, newUsers30, payingUsers,
    conversionPct: totalUsers > 0 ? Math.round((payingUsers / totalUsers) * 1000) / 10 : 0,
    mrr, arr: mrr * 12, tierBreakdown,
    totalAnalyses, analyses7, analyses30,
    activeUsers7: active7.size, activeUsers30: active30.size,
    watches, savedSearches, series, users,
  };
}
