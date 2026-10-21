import { NextResponse } from "next/server";
import { basisFor, getMarket, nearbySimilar } from "@/lib/buyer/market";
import { plansNear, planKind } from "@/lib/buyer/plans";
import { getDstAppreciationPct, getDstLatestYoY, landsdelOf } from "@/lib/dst";
import { getMarketRates } from "@/lib/market-rates";
import { brokerOf } from "@/lib/buyer/brokers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/*
 * GET /api/boligkoeb/home?id=: everything a buyer needs on one home, from
 * open sources: the listing (photo, link, price history), how its price
 * compares with similar homes for sale, the area's price trend from Danmarks
 * Statistik, today's mortgage rates from Nationalbanken and the local plans
 * around it from Plandata.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const m = await getMarket();
  const h = m?.byId.get(id);
  if (!m || !h) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const rowP = fetch(`${base}/rest/v1/market_listings?select=image,url,price_history,road,city&id=eq.${encodeURIComponent(id)}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" })
    .then((r) => (r.ok ? r.json() : [])).then((r) => (r as Record<string, unknown>[])[0] ?? null).catch(() => null);

  const [row, growth, yoy, rates, plans] = await Promise.all([
    rowP,
    // Sommerhuse have no index for every landsdel; houses in general stand in for them.
    getDstAppreciationPct(h.kommune, h.type).then((v) => v ?? getDstAppreciationPct(h.kommune, "villa")).catch(() => null),
    getDstLatestYoY(h.kommune, h.type).then((v) => v ?? getDstLatestYoY(h.kommune, "villa")).catch(() => null),
    getMarketRates().catch(() => null),
    plansNear(h.lat, h.lon, 2000).catch(() => []),
  ]);

  // The postnummer right now: how many homes, the typical m² price, how many have been cut.
  const inZip = m.homes.filter((x) => x.zip === h.zip);
  const sameKind = inZip.filter((x) => x.type === h.type);
  const ppms = sameKind.map((x) => x.ppm).sort((a, b) => a - b);
  const area = {
    zip: h.zip,
    homes: inZip.length,
    sameKind: sameKind.length,
    medianPpm: ppms.length ? ppms[Math.floor(ppms.length / 2)] : null,
    cutShare: inZip.length ? Math.round((inZip.filter((x) => x.cutPct > 0).length / inZip.length) * 100) : null,
    newLast30: inZip.filter((x) => x.knownStart && Date.now() - Date.parse(x.firstSeen) < 30 * 86400_000).length,
    goodShare: inZip.length ? Math.round((inZip.filter((x) => x.verdict === "godt").length / inZip.length) * 100) : null,
  };

  return NextResponse.json({
    ok: true,
    home: h,
    listing: { image: (row?.image as string) ?? null, url: (row?.url as string) ?? null, broker: brokerOf(row?.url as string | null), history: Array.isArray(row?.price_history) ? row!.price_history : [] },
    basis: basisFor(m, h),
    similar: nearbySimilar(m, h, 8),
    area,
    trend: { growth, yoy, region: landsdelOf(h.kommune) },
    rates,
    plans: plans.slice(0, 25).map((p) => ({ ...p, kind: planKind(p.use) })),
  }, { headers: { "Cache-Control": "private, max-age=600" } });
}
