/* eslint-disable @typescript-eslint/no-explicit-any */
import { validUnsubscribeToken } from "@/lib/lifecycle";

/*
 * One-click opt-out from the lifecycle emails (the link in their footer).
 * Signed per user, so nobody can unsubscribe someone else.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · NordInvest</title><meta name="robots" content="noindex"></head>
    <body style="margin:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1f3d;">
    <main style="max-width:480px;margin:12vh auto 0;padding:32px 24px;background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,.06),0 12px 32px -16px rgba(15,23,42,.2);">
    <p style="margin:0 0 16px;font-weight:700;">NordInvest</p><h1 style="margin:0 0 8px;font-size:22px;">${title}</h1>
    <p style="margin:0;line-height:1.6;color:#475569;">${body}</p>
    <p style="margin:24px 0 0;"><a href="https://nordinvest.io" style="color:#2563eb;font-weight:600;text-decoration:none;">Til forsiden</a></p></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const u = sp.get("u") ?? "";
  const t = sp.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(u) || !validUnsubscribeToken(u, t)) {
    return page("Linket virker ikke", "Afmeldingslinket er ugyldigt eller ufuldstændigt. Skriv til contact@nordinvest.io, så afmelder vi dig.", 400);
  }
  if (!URL_BASE || !KEY) return page("Noget gik galt", "Prøv igen om lidt, eller skriv til contact@nordinvest.io.", 500);
  const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
  const res = await fetch(`${URL_BASE}/auth/v1/admin/users/${u}`, { headers: h, cache: "no-store" });
  if (!res.ok) return page("Noget gik galt", "Prøv igen om lidt, eller skriv til contact@nordinvest.io.", 500);
  const user: any = await res.json();
  if (sp.get("type") === "deals") {
    // Opt out of the monthly deals email only (consent lives in user_metadata).
    await fetch(`${URL_BASE}/auth/v1/admin/users/${u}`, {
      method: "PUT",
      headers: h,
      body: JSON.stringify({ user_metadata: { ...(user.user_metadata ?? {}), deals_optin: false, deals_optout_at: new Date().toISOString() } }),
    });
    return page("Du er afmeldt", "Du får ikke flere mails med månedens deals. Du kan altid tilmelde dig igen på dit dashboard.");
  }
  await fetch(`${URL_BASE}/auth/v1/admin/users/${u}`, {
    method: "PUT",
    headers: h,
    body: JSON.stringify({ app_metadata: { ...(user.app_metadata ?? {}), lifecycle_optout: true } }),
  });
  return page("Du er afmeldt", "Du får ikke flere mails om din konto fra os. Mails, du selv har bestilt, som prisvagt, kommer stadig.");
}
