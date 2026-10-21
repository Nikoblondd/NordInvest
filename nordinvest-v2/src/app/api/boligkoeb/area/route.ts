import { NextResponse } from "next/server";
import { plansNear, planKind } from "@/lib/buyer/plans";
import { getDstAppreciationPct, getDstLatestYoY, landsdelOf } from "@/lib/dst";
import { getMarketRates } from "@/lib/market-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/boligkoeb/area?lat&lon&kommune: the dashboard's area panel. Local plans within 3 km, the price trend and today's mortgage rate. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const lat = Number(p.get("lat")), lon = Number(p.get("lon")), kommune = p.get("kommune") || null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 54 || lat > 58 || lon < 7 || lon > 16) return NextResponse.json({ ok: false, reason: "point" }, { status: 422 });
  const [plans, growth, yoy, rates] = await Promise.all([
    plansNear(lat, lon, 3000).catch(() => []),
    getDstAppreciationPct(kommune, "villa").catch(() => null),
    getDstLatestYoY(kommune, "villa").catch(() => null),
    getMarketRates().catch(() => null),
  ]);
  return NextResponse.json({
    ok: true,
    plans: plans.slice(0, 40).map((x) => ({ ...x, kind: planKind(x.use) })),
    trend: { growth, yoy, region: landsdelOf(kommune) },
    rate: rates ? { fixed: rates.household.fixed, variable: rates.household.variable, label: rates.label } : null,
  }, { headers: { "Cache-Control": "private, max-age=1800" } });
}
