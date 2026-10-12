import { NextResponse } from "next/server";
import { getValuation } from "@/lib/vur";
import { gateApi } from "@/lib/gate";

// Offentlig ejendomsvurdering for a BFE number. Public data; cached a day.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = await gateApi(req);
  if (denied) return denied;
  const bfe = Number(new URL(req.url).searchParams.get("bfe"));
  if (!Number.isInteger(bfe) || bfe <= 0) return NextResponse.json({ ok: false, reason: "bad_bfe" }, { status: 400 });
  const v = await getValuation(bfe);
  // Cache only real answers; a miss is retried on the next request.
  return v
    ? NextResponse.json({ ok: true, ...v }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } })
    : NextResponse.json({ ok: false, reason: "not_found" }, { headers: { "Cache-Control": "no-store" } });
}
