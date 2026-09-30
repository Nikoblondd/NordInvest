import { NextResponse } from "next/server";
import {
  computeCalibration,
  blendRentFactor,
  confidenceTier,
  NEUTRAL_CALIBRATION,
  type OutcomeRow,
} from "@/lib/calibration";
import { getDstAppreciationPct } from "@/lib/dst";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Region-aware model state. Aggregates ALL reported outcomes (service-role,
// anonymised — only factors returned), computes a global calibration and, when
// a ?region= is given, a region-specific one blended toward global as a prior.
export async function GET(req: Request) {
  const region = new URL(req.url).searchParams.get("region");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({
      ...NEUTRAL_CALIBRATION,
      region,
      regionCount: 0,
      globalCount: 0,
      tier: "none",
      avgRating: null,
      feedbackCount: 0,
    });
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const rest = (path: string) =>
    fetch(`${url}/rest/v1/${path}`, { headers, cache: "no-store" })
      .then((r) => r.json())
      .catch(() => []);

  const [all, feedback] = await Promise.all([
    rest("analysis_outcomes?select=predicted,actual_monthly_rent,actual_sale_price,months_held,region"),
    rest("analysis_feedback?select=rating"),
  ]);

  const allRows = (Array.isArray(all) ? all : []) as (OutcomeRow & { region: string | null })[];
  const globalCal = computeCalibration(allRows);

  const regionRows = region ? allRows.filter((r) => r.region === region) : [];
  const regionCal = computeCalibration(regionRows);

  const rentFactor = region ? blendRentFactor(regionCal, globalCal) : globalCal.rentFactor;
  // Appreciation, in priority order: our own reported outcomes (region → global),
  // then — when we have none yet — DST's official realized-sale price trend for
  // the region. This grounds the assumption in real transaction data instead of
  // a flat default, from day one.
  const outcomeAppreciation =
    (region ? regionCal.observedAppreciationPct : null) ?? globalCal.observedAppreciationPct;
  let observedAppreciationPct = outcomeAppreciation;
  let appreciationSource: "outcomes" | "dst" | null = outcomeAppreciation != null ? "outcomes" : null;
  if (observedAppreciationPct == null) {
    const dst = await getDstAppreciationPct(region).catch(() => null);
    if (dst != null) {
      observedAppreciationPct = dst;
      appreciationSource = "dst";
    }
  }
  const regionCount = region ? regionRows.length : allRows.length;

  const ratings = (Array.isArray(feedback) ? feedback : []).map((f) => f.rating as number).filter((n) => n >= 1 && n <= 5);
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  return NextResponse.json({
    region,
    regionCount,
    globalCount: allRows.length,
    rentFactor,
    observedAppreciationPct,
    appreciationSource,
    confidence: globalCal.confidence,
    tier: confidenceTier(regionCount),
    count: allRows.length,
    avgRating,
    feedbackCount: ratings.length,
  });
}
