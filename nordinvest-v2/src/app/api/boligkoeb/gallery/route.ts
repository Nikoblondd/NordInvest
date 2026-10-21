import { NextResponse } from "next/server";
import { gallery } from "@/lib/buyer/gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/boligkoeb/gallery?id=: the home's photos and floor plans from the agent's listing (cached a week). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[\w:.-]{3,80}$/.test(id)) return NextResponse.json({ ok: false }, { status: 422 });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const r = await fetch(`${base}/rest/v1/market_listings?select=url,image&id=eq.${encodeURIComponent(id)}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }).catch(() => null);
  const row = r?.ok ? ((await r.json()) as { url: string | null; image: string | null }[])[0] : null;
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  const images = await gallery(id, row.url, row.image);
  return NextResponse.json({ ok: true, images }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
