import { NextResponse } from "next/server";
import { buyerUser, denied } from "@/lib/buyer/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/boligkoeb/images?ids=a,b,c: photo and listing link for up to 60 homes (the visible list). */
export async function GET(req: Request) {
  if (!(await buyerUser())) return denied();
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter((s) => /^[\w:.-]{3,80}$/.test(s)).slice(0, 60);
  if (!ids.length) return NextResponse.json({ ok: true, images: {} });
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const list = ids.map((i) => `"${i.replace(/"/g, "")}"`).join(",");
  const r = await fetch(`${base}/rest/v1/market_listings?select=id,image&id=in.(${encodeURIComponent(list)})`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }).catch(() => null);
  const rows = r?.ok ? ((await r.json()) as { id: string; image: string | null }[]) : [];
  const images: Record<string, string | null> = {};
  for (const x of rows) images[x.id] = x.image;
  return NextResponse.json({ ok: true, images }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
