import { NextResponse } from "next/server";
import { hasToolAccess, isBroker } from "@/lib/access";
import { generateLink, listAuthUsers } from "@/lib/supabase/admin";
import { PITCH_FROM } from "@/lib/outreach/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/auth/link { email }: "Glemt adgangskode?". Sends a one-time
 * sign-in link, only to accounts that have access, and always answers the
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
  const link = await generateLink(email, `${SITE}${broker ? "/maegler" : "/app"}`, undefined, "magiclink");
  if ("error" in link) return ok();
  const url = `${SITE}/auth/confirm?token_hash=${encodeURIComponent(link.tokenHash)}&type=${link.type}&next=${encodeURIComponent(broker ? "/maegler" : "/app/konto?skift=adgangskode")}`;
  const key = process.env.RESEND_API_KEY;
  if (key) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: PITCH_FROM, to: [email], reply_to: "contact@nordinvest.io",
        subject: "Dit login-link til NordInvest",
        html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;color:#0f172a;font-size:15px;line-height:1.6"><p>Hej,</p><p>Her er dit login-link til NordInvest. Det virker én gang. Når du er logget ind, kan du vælge en ny adgangskode under Konto.</p><p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:8px">Log ind</a></p><p style="font-size:13px;color:#64748b">Har du ikke bedt om linket, kan du se bort fra denne mail.</p><p>Nikolaj Blond<br>NordInvest</p></div>`,
      }),
    }).catch(() => null);
  }
  return ok();
}
