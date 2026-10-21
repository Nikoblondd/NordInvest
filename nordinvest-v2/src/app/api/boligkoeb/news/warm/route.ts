import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/gate";
import { warmNews } from "@/lib/buyer/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/boligkoeb/news/warm (Vercel cron, hourly): refreshes the local news of the kommuner that are due. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const done = await warmNews(6);
  return NextResponse.json({ ok: true, refreshed: done });
}
