import { NextResponse } from "next/server";
import { generateLink, listAuthUsers, updateAppMetadata } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail/send";
import { LOGIN_FIELD, newLogin, safePath } from "@/lib/buyer/login";
import { originOf } from "@/lib/buyer/login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/boligkryds/login { email, next? }: e-mails a login link. A new
 * address gets an account on the spot; no password, ever. At most one mail a
 * minute per address. Always answers ok, so it can't be used to find out who
 * has an account.
 */
const ok = () => NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; next?: string; website?: string };
  if (body.website) return ok();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return NextResponse.json({ ok: false, reason: "email" }, { status: 422 });
  const origin = originOf(req);

  let user = (await listAuthUsers()).find((u) => (u.email ?? "").toLowerCase() === email);
  if (!user) {
    // Creates the account (an invite link that is never sent).
    const made = await generateLink(email, `${origin}/`);
    if ("error" in made) return NextResponse.json({ ok: false, reason: "failed" }, { status: 502 });
    user = { id: made.userId, email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } as never;
  }
  const meta = (user!.app_metadata ?? {}) as Record<string, unknown>;
  const last = Date.parse(String((meta[LOGIN_FIELD] as { sent_at?: string } | undefined)?.sent_at ?? ""));
  if (Number.isFinite(last) && Date.now() - last < 60_000) return ok();

  const { token, record } = newLogin(safePath(body.next));
  if (!(await updateAppMetadata(user!.id, { [LOGIN_FIELD]: { ...record, sent_at: new Date().toISOString() }, boligkryds: true }))) {
    return NextResponse.json({ ok: false, reason: "failed" }, { status: 502 });
  }
  const url = `${origin}/login/${user!.id}.${token}`;
  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;color:#0f172a;font-size:15px;line-height:1.6">
<p style="font-size:20px;font-weight:700;margin:0 0 12px">Log ind på Boligkryds</p>
<p>Tryk på knappen, så er du logget ind. Du skal ikke bruge en adgangskode.</p>
<p style="margin:26px 0"><a href="${url}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:600;padding:13px 24px;border-radius:999px">Log ind</a></p>
<p style="font-size:13px;color:#64748b">Linket virker én gang inden for 24 timer. Har du ikke bedt om det, kan du se bort fra mailen.</p></div>`;
  await sendMail({ from: "Boligkryds <adgang@nordinvest.io>", to: email, subject: "Dit login til Boligkryds", html, idempotencyKey: `bk-login-${user!.id}-${record.hash.slice(0, 12)}` });
  return ok();
}
