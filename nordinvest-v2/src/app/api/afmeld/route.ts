import { NextResponse } from "next/server";
import { unsubscribeToken } from "@/lib/outreach/guard";
import { suppress } from "@/lib/outreach/suppression";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/afmeld?e=&t=: one-click unsubscribe from outreach mail (RFC 8058), also used by the /afmeld page. */
export async function POST(req: Request) {
  const sp = new URL(req.url).searchParams;
  let email = "";
  try { email = Buffer.from(sp.get("e") ?? "", "base64url").toString("utf8").trim().toLowerCase(); } catch { /* invalid */ }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || sp.get("t") !== unsubscribeToken(email)) return NextResponse.json({ ok: false }, { status: 400 });
  const ok = await suppress(email);
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
