// Server-side reader for PostHog aggregates, so the admin board can show
// traffic + behaviour (visitors, referrers, top pages, funnel) alongside the
// Supabase money metrics. Uses a PERSONAL API key (read) kept server-only —
// never NEXT_PUBLIC. Degrades to {configured:false} when the key isn't set.
const HOST = (process.env.POSTHOG_HOST || "https://eu.posthog.com").replace(/\/$/, "");
const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ENV = process.env.POSTHOG_PROJECT_ID;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function projectId(): Promise<string | null> {
  if (PROJECT_ENV) return PROJECT_ENV;
  try {
    const res = await fetch(`${HOST}/api/projects/`, { headers: { Authorization: `Bearer ${KEY}` }, cache: "no-store" });
    if (!res.ok) return null;
    const d = await res.json();
    const id = d?.results?.[0]?.id;
    return id != null ? String(id) : null;
  } catch {
    return null;
  }
}

async function hogql(pid: string, query: string): Promise<any[][]> {
  try {
    const res = await fetch(`${HOST}/api/projects/${pid}/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d?.results) ? d.results : [];
  } catch {
    return [];
  }
}

const one = (rows: any[][], i = 0, j = 0): number => Number(rows?.[i]?.[j] ?? 0) || 0;
const pairs = (rows: any[][]): { label: string; count: number }[] =>
  rows.map((r) => ({ label: String(r[0] ?? "").trim() || "(ukendt)", count: Number(r[1] ?? 0) || 0 }));

export type PosthogAnalytics = {
  configured: boolean;
  projectUrl: string | null;
  visitors7: number;
  visitors30: number;
  pageviews7: number;
  pageviews30: number;
  topReferrers: { label: string; count: number }[];
  topPages: { label: string; count: number }[];
  topLanding: { label: string; count: number }[];
  events30: { label: string; count: number }[];
};

const EMPTY: PosthogAnalytics = {
  configured: false, projectUrl: null, visitors7: 0, visitors30: 0, pageviews7: 0, pageviews30: 0,
  topReferrers: [], topPages: [], topLanding: [], events30: [],
};

export async function getPosthogAnalytics(): Promise<PosthogAnalytics> {
  if (!KEY) return EMPTY;
  const pid = await projectId();
  if (!pid) return EMPTY;

  const [v7, v30, ref, pages, landing, events] = await Promise.all([
    hogql(pid, `SELECT count(DISTINCT person_id), count() FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 7 DAY`),
    hogql(pid, `SELECT count(DISTINCT person_id), count() FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY`),
    hogql(pid, `SELECT multiIf(properties.$referring_domain IS NULL OR properties.$referring_domain IN ('', '$direct'), 'Direkte / ingen henvisning', properties.$referring_domain) AS s, count() AS c FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY s ORDER BY c DESC LIMIT 8`),
    hogql(pid, `SELECT properties.$pathname AS p, count() AS c FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY p ORDER BY c DESC LIMIT 10`),
    hogql(pid, `SELECT properties.$pathname AS p, count() AS c FROM events WHERE event = '$pageview' AND properties.$prev_pageview_pathname IS NULL AND timestamp >= now() - INTERVAL 30 DAY GROUP BY p ORDER BY c DESC LIMIT 8`),
    hogql(pid, `SELECT event, count() AS c FROM events WHERE event IN ('analyze_started','analysis_completed','paywall_shown','checkout_clicked','time_savings_reported','$autocapture') AND timestamp >= now() - INTERVAL 30 DAY GROUP BY event ORDER BY c DESC LIMIT 12`),
  ]);

  return {
    configured: true,
    projectUrl: `${HOST}/project/${pid}`,
    visitors7: one(v7, 0, 0), pageviews7: one(v7, 0, 1),
    visitors30: one(v30, 0, 0), pageviews30: one(v30, 0, 1),
    topReferrers: pairs(ref),
    topPages: pairs(pages),
    topLanding: pairs(landing),
    events30: pairs(events),
  };
}
