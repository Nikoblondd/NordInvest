import { NextResponse } from "next/server";
import { getUdlejerindeks, monthKey, storeReading } from "@/lib/udlejerindeks";

/*
 * Stores this month's official Udlejerindeks reading. A Vercel cron calls it
 * on the 1st; a repeat call the same month overwrites that month's row.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const idx = await getUdlejerindeks();
  if (!idx) return NextResponse.json({ ok: false, error: "no_data" }, { status: 500 });
  const month = monthKey();
  const ok = await storeReading(month, idx);
  return NextResponse.json({ ok, month, ranked: idx.ranked, scanned: idx.scanned, positive: idx.positive });
}
