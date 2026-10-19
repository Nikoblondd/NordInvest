import { NextResponse } from "next/server";
import { gateApi } from "@/lib/gate";
import { dossier, zipOf } from "@/lib/dossier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/*
 * GET /api/property/dossier?address=…: the public record of an investment
 * property (BBR units and materials, public valuation, estimated land tax,
 * market rent per flat) for the member analysis. Members only.
 */
export async function GET(req: Request) {
  const denied = await gateApi(req);
  if (denied) return denied;
  const address = (new URL(req.url).searchParams.get("address") ?? "").trim().slice(0, 160);
  if (address.length < 5) return NextResponse.json({ ok: false, reason: "address" }, { status: 422 });
  const d = await dossier(address, zipOf(address));
  return NextResponse.json(d ? { ok: true, dossier: d } : { ok: false, reason: "not_found" }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
