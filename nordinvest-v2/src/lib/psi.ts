// PageSpeed Insights — pulls Google's own CrUX field data (real users' 28-day
// p75 LCP, INP, CLS) for our key public URLs. No API key needed at the volume
// we call (the free unauthenticated quota is generous and we run this at most
// a few times per hour behind Next's fetch cache).
//
// If a URL doesn't have enough real-user traffic yet, the field payload is
// empty; we fall back to the lab-generated Lighthouse numbers so the cockpit
// always shows something honest and labelled ("field" vs "lab").

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const TARGETS = [
  "https://nordinvest.io/",
  "https://nordinvest.io/analyseren",
  "https://nordinvest.io/deals",
] as const;

export type Vital = {
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  source: "field" | "lab" | "unavailable";
};

export type PsiResult = {
  url: string;
  ok: boolean;
  error?: string;
  vitals: Vital;
};

export type PsiReport = {
  results: PsiResult[];
  updatedAt: string;
  overall: {
    lcpGreen: boolean; // every measured URL ≤ 2500 ms
    inpGreen: boolean; // every measured URL ≤ 200 ms
    clsGreen: boolean; // every measured URL ≤ 0.1
    allGreen: boolean;
    landingLcpMs: number | null;
  };
};

// Thresholds — Google's own "good" cutoffs.
const LCP_GOOD = 2500;
const INP_GOOD = 200;
const CLS_GOOD = 0.1;

async function fetchOne(url: string): Promise<PsiResult> {
  const q = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  const key = process.env.PAGESPEED_INSIGHTS_KEY;
  if (key) q.set("key", key);

  try {
    const res = await fetch(`${PSI_ENDPOINT}?${q.toString()}`, {
      next: { revalidate: 60 * 60 * 6 }, // 6h — Google's field data updates daily
    });
    if (!res.ok) {
      return { url, ok: false, error: `PSI ${res.status}`, vitals: { lcpMs: null, inpMs: null, cls: null, source: "unavailable" } };
    }
    const j: unknown = await res.json();
    const doc = j as {
      loadingExperience?: {
        metrics?: Record<string, { percentile?: number }>;
      };
      lighthouseResult?: {
        audits?: Record<string, { numericValue?: number }>;
      };
    };
    // Prefer real-user field data (28-day p75).
    const field = doc.loadingExperience?.metrics;
    const lcpField = field?.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
    const inpField = field?.INTERACTION_TO_NEXT_PAINT?.percentile;
    const clsFieldRaw = field?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
    if (Number.isFinite(lcpField) && Number.isFinite(clsFieldRaw)) {
      return {
        url,
        ok: true,
        vitals: {
          lcpMs: Math.round(lcpField as number),
          inpMs: Number.isFinite(inpField) ? Math.round(inpField as number) : null,
          // CrUX reports CLS × 100 as an integer.
          cls: Math.round(((clsFieldRaw as number) / 100) * 1000) / 1000,
          source: "field",
        },
      };
    }
    // Fall back to Lighthouse lab data.
    const audits = doc.lighthouseResult?.audits;
    const lcpLab = audits?.["largest-contentful-paint"]?.numericValue;
    const clsLab = audits?.["cumulative-layout-shift"]?.numericValue;
    if (Number.isFinite(lcpLab) && Number.isFinite(clsLab)) {
      return {
        url,
        ok: true,
        vitals: {
          lcpMs: Math.round(lcpLab as number),
          inpMs: null, // INP has no lab equivalent
          cls: Math.round((clsLab as number) * 1000) / 1000,
          source: "lab",
        },
      };
    }
    return { url, ok: false, error: "no metrics in response", vitals: { lcpMs: null, inpMs: null, cls: null, source: "unavailable" } };
  } catch (e) {
    return {
      url,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      vitals: { lcpMs: null, inpMs: null, cls: null, source: "unavailable" },
    };
  }
}

export async function getPsiReport(): Promise<PsiReport> {
  // Sequential, not parallel — Google's unauthenticated PSI quota rate-limits
  // bursts and returns 429 for even 3 concurrent calls. With a key set
  // (PAGESPEED_INSIGHTS_KEY in Vercel env — free at
  // https://developers.google.com/speed/docs/insights/v5/get-started) we get
  // 25k requests/day.
  const results: PsiResult[] = [];
  for (const url of TARGETS) {
    // Small pace so we stay under the per-second cap even without a key.
    if (results.length > 0) await new Promise((r) => setTimeout(r, 400));
    results.push(await fetchOne(url));
  }

  const measured = results.filter((r) => r.ok && r.vitals.source !== "unavailable");
  const lcpGreen = measured.length > 0 && measured.every((r) => (r.vitals.lcpMs ?? Infinity) <= LCP_GOOD);
  // INP only available in field mode — treat lab-only pages as pass-through so
  // we don't punish a healthy site just because Google has no field data yet.
  const inpGreen =
    measured.length > 0 &&
    measured.every((r) => r.vitals.source !== "field" || (r.vitals.inpMs ?? Infinity) <= INP_GOOD);
  const clsGreen = measured.length > 0 && measured.every((r) => (r.vitals.cls ?? Infinity) <= CLS_GOOD);

  const landing = results.find((r) => r.url === TARGETS[0]);

  return {
    results,
    updatedAt: new Date().toISOString(),
    overall: {
      lcpGreen,
      inpGreen,
      clsGreen,
      allGreen: lcpGreen && inpGreen && clsGreen,
      landingLcpMs: landing?.vitals.lcpMs ?? null,
    },
  };
}
