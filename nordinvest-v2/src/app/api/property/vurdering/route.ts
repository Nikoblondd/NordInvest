import { NextResponse } from "next/server";
import { getValuation } from "@/lib/vur";

// Offentlig ejendomsvurdering for a BFE number. Public data; cached a day.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const bfe = Number(new URL(req.url).searchParams.get("bfe"));
  if (!Number.isInteger(bfe) || bfe <= 0) return NextResponse.json({ ok: false, reason: "bad_bfe" }, { status: 400 });
  const v = await getValuation(bfe);
  return NextResponse.json(v ? { ok: true, ...v } : { ok: false, reason: "not_found" }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
