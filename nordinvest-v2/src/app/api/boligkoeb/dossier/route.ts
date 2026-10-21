import { NextResponse } from "next/server";
import { getMarket } from "@/lib/buyer/market";
import { dossier } from "@/lib/dossier";
import { getFutureBurdens } from "@/lib/future-burdens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/boligkoeb/dossier?id=: the public records on a home (BBR, offentlig vurdering, grundskyld, lokalplan and kloak on the plot). Slow, so separate. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const h = (await getMarket())?.byId.get(id);
  if (!h) return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  const [d, burdens] = await Promise.all([
    dossier(h.address, h.zip, 18000).catch(() => null),
    getFutureBurdens(h.address).catch(() => null),
  ]);
  return NextResponse.json({ ok: true, dossier: d, burdens }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
