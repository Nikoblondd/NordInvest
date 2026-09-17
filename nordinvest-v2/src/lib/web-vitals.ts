// Real-user Web Vitals via PostHog $web_vitals events. Preferred over
// PageSpeed Insights because it (a) reflects our actual visitors, not Google's
// synthetic lab or CrUX 28-day p75, and (b) has no external rate limit. We
// still keep PSI as a fallback for the launch cockpit when we don't have
// enough real-user samples yet.

const HOST = (process.env.POSTHOG_HOST || "https://eu.posthog.com").replace(/\/$/, "");
const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT_ENV = process.env.POSTHOG_PROJECT_ID;

// Google's "good" thresholds — same ones the cockpit already uses.
export const LCP_GOOD = 2500;
export const INP_GOOD = 200;
export const CLS_GOOD = 0.1;
// Below this many samples per path we don't trust our own p75 and fall back
// to PSI. Real-user metrics need a real sample size.
const MIN_SAMPLES = 20;

export type Vitals = {
  path: string;
  samples: number;
  lcpP75: number | null;
  inpP75: number | null;
  clsP75: number | null;
};

export type VitalsSummary = {
  configured: boolean;
  windowDays: number;
  totalSamples: number;
  perPath: Vitals[];
  overall: {
    lcpP75: number | null;
    inpP75: number | null;
    clsP75: number | null;
    lcpGreen: boolean;
    inpGreen: boolean;
    clsGreen: boolean;
    allGreen: boolean;
  };
};

async function projectId(): Promise<string | null> {
  if (PROJECT_ENV) return PROJECT_ENV;
  try {
    const res = await fetch(`${HOST}/api/projects/`, {
      headers: { Authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { results?: { id: number | string }[] };
    const id = d?.results?.[0]?.id;
    return id != null ? String(id) : null;
  } catch {
    return null;
  }
}

async function hogql(pid: string, query: string): Promise<unknown[][]> {
  try {
    const res = await fetch(`${HOST}/api/projects/${pid}/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const d = (await res.json()) as { results?: unknown[][] };
    return Array.isArray(d.results) ? d.results : [];
  } catch {
    return [];
  }
}

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Which paths we want measured. Match against $pathname LIKE — trailing wildcards
// aggregate all sub-routes under a section.
const WATCH_PATHS = ["/", "/analyseren", "/deals"];

export async function getWebVitalsSummary(windowDays = 28): Promise<VitalsSummary> {
  const empty: VitalsSummary = {
    configured: false,
    windowDays,
    totalSamples: 0,
    perPath: WATCH_PATHS.map((p) => ({ path: p, samples: 0, lcpP75: null, inpP75: null, clsP75: null })),
    overall: {
      lcpP75: null,
      inpP75: null,
      clsP75: null,
      lcpGreen: false,
      inpGreen: false,
      clsGreen: false,
      allGreen: false,
    },
  };
  if (!KEY) return empty;
  const pid = await projectId();
  if (!pid) return empty;

  // Per-path p75 across LCP, INP, CLS. PostHog stores web-vitals as either the
  // dedicated columns properties.$web_vitals_{LCP,INP,CLS}_value (newer SDKs)
  // or as separate events named `$web_vitals` with a `metric_name`. This query
  // covers both shapes with coalesce.
  const q = `
    SELECT
      properties.$pathname AS path,
      count() AS n,
      quantile(0.75)(toFloat(coalesce(properties.$web_vitals_LCP_value, properties.$performance_LCP))) AS lcp,
      quantile(0.75)(toFloat(coalesce(properties.$web_vitals_INP_value, properties.$performance_INP))) AS inp,
      quantile(0.75)(toFloat(coalesce(properties.$web_vitals_CLS_value, properties.$performance_CLS))) AS cls
    FROM events
    WHERE event = '$web_vitals'
      AND timestamp >= now() - INTERVAL ${windowDays} DAY
      AND properties.$pathname IN (${WATCH_PATHS.map((p) => `'${p}'`).join(", ")})
    GROUP BY path
  `;
  const rows = await hogql(pid, q);

  const perPath: Vitals[] = WATCH_PATHS.map((p) => {
    const r = rows.find((row) => String(row[0]) === p);
    return {
      path: p,
      samples: Number(r?.[1] ?? 0) || 0,
      lcpP75: num(r?.[2]),
      inpP75: num(r?.[3]),
      clsP75: num(r?.[4]),
    };
  });

  const trusted = perPath.filter((p) => p.samples >= MIN_SAMPLES);
  const totalSamples = perPath.reduce((s, p) => s + p.samples, 0);

  // Cross-path p75 rolled up: take the worst (highest for LCP/INP, highest for CLS).
  const worst = (fn: (v: Vitals) => number | null) => {
    const vals = trusted.map(fn).filter((v): v is number => v != null);
    return vals.length ? Math.max(...vals) : null;
  };
  const overallLcp = worst((v) => v.lcpP75);
  const overallInp = worst((v) => v.inpP75);
  const overallCls = worst((v) => v.clsP75);

  return {
    configured: true,
    windowDays,
    totalSamples,
    perPath,
    overall: {
      lcpP75: overallLcp,
      inpP75: overallInp,
      clsP75: overallCls,
      lcpGreen: overallLcp != null && overallLcp <= LCP_GOOD,
      // INP frequently null when the visitor didn't interact — don't punish that.
      inpGreen: overallInp == null || overallInp <= INP_GOOD,
      clsGreen: overallCls != null && overallCls <= CLS_GOOD,
      allGreen:
        overallLcp != null &&
        overallLcp <= LCP_GOOD &&
        (overallInp == null || overallInp <= INP_GOOD) &&
        overallCls != null &&
        overallCls <= CLS_GOOD,
    },
  };
}
