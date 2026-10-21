import { NextResponse } from "next/server";
import { hasToolAccess, isBroker } from "@/lib/access";
import { listAuthUsers, updateAppMetadata } from "@/lib/supabase/admin";
import { FIELD, LOGIN_TTL_MS, linkUrl, newLink } from "@/lib/access/invite-link";
import { sendMail } from "@/lib/mail/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/auth/link { email }: "Glemt adgangskode?". Sends a sign-in link
 * that works once within 24 hours (see lib/access/invite-link.ts), only to accounts that have access, and always answers the
 * same way so nobody can test which addresses exist. No account is created.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const ok = () => NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return ok();
  const user = (await listAuthUsers()).find((u) => (u.email ?? "").toLowerCase() === email);
  if (!user || !(hasToolAccess(user) || isBroker(user))) return ok();
  const broker = !hasToolAccess(user);
  const { token, record } = newLink(broker ? "/maegler" : "/app/konto?skift=adgangskode", undefined, LOGIN_TTL_MS);
  if (!(await updateAppMetadata(user.id, { [FIELD.login]: record }))) return ok();
  const url = linkUrl(SITE, user.id, token);
  await sendMail({ to: email, subject: "Dit login-link til NordInvest", html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;color:#0f172a;font-size:15px;line-height:1.6"><p>Hej,</p><p>Her er dit login-link til NordInvest. Det virker én gang inden for 24 timer. Når du er logget ind, kan du vælge en ny adgangskode under Konto.</p><p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:8px">Log ind</a></p><p style="font-size:13px;color:#64748b">Har du ikke bedt om linket, kan du se bort fra denne mail.</p><p>Nikolaj Blond<br>NordInvest</p></div>` });
  return ok();
}
