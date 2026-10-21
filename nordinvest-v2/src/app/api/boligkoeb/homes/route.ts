import { NextResponse } from "next/server";
import { getMarket } from "@/lib/buyer/market";
import { buyerUser, denied } from "@/lib/buyer/gate";
import { COLS } from "@/lib/buyer/cols";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * GET /api/boligkoeb/homes: every home for sale with its price verdict, for
 * the map. Sent as rows of plain values (column order in lib/buyer/cols) to keep 26.000 homes small.
 */

export async function GET() {
  if (!(await buyerUser())) return denied();
  const m = await getMarket();
  if (!m) return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });
  // Repeated strings go out once in `dict` and as an index in each row; ids lose their common prefix; first seen is minutes after the baseline.
  const r5 = (v: number) => Math.round(v * 1e5) / 1e5;
  const dict = { type: [] as string[], kommune: [] as (string | null)[], verdict: ["godt", "middel", "dyrt"] };
  const idx = <T,>(list: T[], v: T) => { let i = list.indexOf(v); if (i < 0) { list.push(v); i = list.length - 1; } return i; };
  const base = Date.parse(m.baseline);
  const rows = m.homes.map((h) => [h.id.replace(/^boligsiden:/, ""), r5(h.lat), r5(h.lon), h.price, h.area, h.rooms, h.year, h.energy, idx(dict.type, h.type), h.zip, idx(dict.kommune, h.kommune), h.address, h.ppm, h.expPpm, h.deltaPct, h.rank, h.score, idx(dict.verdict, h.verdict), h.cutPct, Math.round((Date.parse(h.firstSeen) - base) / 60000), h.knownStart ? 1 : 0, h.suspect ? 1 : 0]);
  return NextResponse.json({ ok: true, builtAt: m.builtAt, baseline: m.baseline, cols: COLS, dict, rows }, { headers: { "Cache-Control": "private, max-age=300" } });
}
