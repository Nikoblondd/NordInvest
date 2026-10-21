import { NextResponse } from "next/server";
import { areaNews } from "@/lib/buyer/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET /api/boligkoeb/news?kommune=slug: what is happening in the kommune, with a source for every item (cached a week). */
export async function GET(req: Request) {
  const slug = (new URL(req.url).searchParams.get("kommune") ?? "").toLowerCase();
  const news = await areaNews(slug);
  return NextResponse.json({ ok: !!news, news }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
