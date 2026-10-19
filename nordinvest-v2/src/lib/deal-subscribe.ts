import { createHmac, timingSafeEqual } from "crypto";

/*
 * "Månedens bedste køb i <by>" for visitors without an account. Marketing
 * email, so consent is explicit (unticked box, the exact wording stored) and
 * double opt-in: the signup only counts once the address owner clicks the link
 * in the confirmation email. Rows live in public.deal_subscribers
 * (supabase/deal-subscribers-migration.sql), written with the service key only.
 */

export { cityOptInText } from "@/lib/deal-subscribe-text";

const secret = () => process.env.LIFECYCLE_SECRET || process.env.CRON_SECRET || "";
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString();

export type SubPayload = { e: string; k: string; t: number };

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url").slice(0, 32);

/** A signed, tamper-proof token for the confirm link (valid 7 days). */
export function confirmToken(p: SubPayload): string {
  const data = b64(JSON.stringify(p));
  return `${data}.${sign(`confirm:${data}`)}`;
}

export function readConfirmToken(token: string): SubPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig || !secret()) return null;
  const want = Buffer.from(sign(`confirm:${data}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(unb64(data)) as SubPayload;
    if (Date.now() - p.t > 7 * 864e5) return null;
    return p;
  } catch {
    return null;
  }
}

/** One-click unsubscribe, signed per address and kommune. */
export const unsubToken = (email: string, kommune: string) => sign(`unsub-city:${email.toLowerCase()}:${kommune}`);

export function validUnsubToken(email: string, kommune: string, token: string): boolean {
  if (!secret()) return false;
  const a = Buffer.from(unsubToken(email, kommune));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const validEmail = (e: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i.test(e) && e.length <= 254;

/** A minimal branded page for the confirm / unsubscribe links. */
export const notice = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="da"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · NordInvest</title><meta name="robots" content="noindex"></head>
    <body style="margin:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f1f3d;">
    <main style="max-width:480px;margin:12vh auto 0;padding:32px 24px;background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,.06),0 12px 32px -16px rgba(15,23,42,.2);">
    <p style="margin:0 0 16px;font-weight:700;">NordInvest</p><h1 style="margin:0 0 8px;font-size:22px;">${title}</h1>
    <p style="margin:0;line-height:1.6;color:#475569;">${body}</p>
    <p style="margin:24px 0 0;"><a href="https://nordinvest.io/deals" style="color:#2563eb;font-weight:600;text-decoration:none;">Se Deal-motoren</a></p></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

const URL_BASE = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
export const dbHeaders = () => ({ apikey: KEY()!, Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" });
export const dbUrl = (path: string) => `${URL_BASE()}/rest/v1/${path}`;
export const dbReady = () => !!(URL_BASE() && KEY());
