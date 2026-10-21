import { NextResponse } from "next/server";
import { plansInBox, planKind } from "@/lib/buyer/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/boligkoeb/plans?bbox=w,s,e,n: local plans from the last three years in the map view (only when zoomed in). */
export async function GET(req: Request) {
  const b = (new URL(req.url).searchParams.get("bbox") ?? "").split(",").map(Number);
  if (b.length !== 4 || b.some((v) => !Number.isFinite(v))) return NextResponse.json({ ok: false, reason: "bbox" }, { status: 422 });
  const [w, s, e, n] = b;
  // A view wider than about 25 km is too much for Plandata and too busy for the map.
  if (e - w > 0.45 || n - s > 0.25) return NextResponse.json({ ok: true, tooWide: true, plans: [] });
  const plans = await plansInBox(w, s, e, n);
  return NextResponse.json({ ok: true, plans: plans.map((p) => ({ ...p, kind: planKind(p.use) })) }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
