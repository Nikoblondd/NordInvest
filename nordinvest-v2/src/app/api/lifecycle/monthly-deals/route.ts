/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { monthKey, unsubscribeToken } from "@/lib/lifecycle";
import { cityDealsEmail, dealsEmail } from "@/lib/deals-email";
import { dealCity } from "@/lib/deal-cities";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import { unsubToken } from "@/lib/deal-subscribe";

/*
 * "Månedens deals" to users who opted in (user_metadata.deals_optin, see
 * lib/deals-optin). Marketing email, so ONLY opted-in users, once a month,
 * each with a one-click opt-out. Runs on the 1st (Vercel Cron); `?dry=1`
 * lists recipients (masked) without sending.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const headers = () => ({ apikey: KEY!, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" });

function authorized(req: Request, dry: boolean): boolean {
  const auth = req.headers.get("authorization");
  const cron = process.env.CRON_SECRET;
  if (cron && auth === `Bearer ${cron}`) return true;
  const dryKey = process.env.LIFECYCLE_DRY_KEY;
  return dry && !!dryKey && auth === `Bearer ${dryKey}`;
}

async function allUsers(): Promise<any[]> {
  const out: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`auth ${res.status}`);
    const users: any[] = (await res.json()).users ?? [];
    out.push(...users);
    if (users.length < 1000) break;
  }
  return out;
}

export async function GET(req: Request) {
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  if (!authorized(req, dry)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!URL_BASE || !KEY) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const key = `deals:${monthKey(new Date())}`;
  const users = await allUsers();
  const optedIn = users.filter((u) => u.email && u.user_metadata?.deals_optin === true);
  const due = optedIn.filter((u) => !u.app_metadata?.lifecycle?.[key]);

  // Visitors who confirmed "Månedens bedste køb i <by>" (deal_subscribers).
  const month = monthKey(new Date());
  const subs: any[] = await fetch(
    `${URL_BASE}/rest/v1/deal_subscribers?select=id,email,kommune,last_sent&confirmed_at=not.is.null&unsubscribed_at=is.null&limit=5000`,
    { headers: headers(), cache: "no-store" },
  ).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const subsDue = Array.isArray(subs) ? subs.filter((s) => s.last_sent !== month) : [];

  if (dry) {
    const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");
    return NextResponse.json({ dry: true, users: users.length, optedIn: optedIn.length, due: due.map((u) => mask(u.email)), citySubscribers: subsDue.map((s) => `${mask(s.email)} · ${s.kommune}`) });
  }

  let sent = 0;
  const reasons: string[] = [];
  for (const u of due.slice(0, 500)) {
    const unsubUrl = `${SITE}/api/lifecycle/unsubscribe?u=${u.id}&t=${unsubscribeToken(u.id)}&type=deals`;
    const mail = dealsEmail({ name: u.user_metadata?.full_name ?? null, unsubUrl });
    const res = await sendEmail({ to: u.email, subject: mail.subject, html: mail.html, replyTo: "contact@nordinvest.io" });
    if (res.ok) {
      sent++;
      const app = u.app_metadata ?? {};
      await fetch(`${URL_BASE}/auth/v1/admin/users/${u.id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ app_metadata: { ...app, lifecycle: { ...(app.lifecycle ?? {}), [key]: new Date().toISOString() } } }),
      });
    } else reasons.push(res.reason);
  }
  // City emails: one snapshot per kommune, shared by its subscribers.
  let citySent = 0;
  const snaps = new Map<string, Awaited<ReturnType<typeof getDealSnapshot>>>();
  for (const s of subsDue.slice(0, 1000)) {
    const c = dealCity(s.kommune);
    if (!c) continue;
    if (!snaps.has(c.slug)) snaps.set(c.slug, await getDealSnapshot(c.slug, 3).catch(() => null));
    const snap = snaps.get(c.slug);
    if (!snap || snap.top.length === 0) continue;
    const unsubUrl = `${SITE}/api/deals/subscribe/unsubscribe?e=${encodeURIComponent(s.email)}&k=${c.slug}&t=${unsubToken(s.email, c.slug)}`;
    const mail = cityDealsEmail({ cityName: c.name, cityIn: c.in, slug: c.slug, deals: snap.top.slice(0, 3), scanned: snap.scanned, positive: snap.positive, unsubUrl });
    const res = await sendEmail({ to: s.email, subject: mail.subject, html: mail.html, replyTo: "contact@nordinvest.io" });
    if (res.ok) {
      citySent++;
      await fetch(`${URL_BASE}/rest/v1/deal_subscribers?id=eq.${s.id}`, {
        method: "PATCH",
        headers: { ...headers(), Prefer: "return=minimal" },
        body: JSON.stringify({ last_sent: month }),
      }).catch(() => null);
    } else reasons.push(res.reason);
  }

  return NextResponse.json({ users: users.length, optedIn: optedIn.length, due: due.length, sent, citySubscribers: subsDue.length, citySent, reasons: Array.from(new Set(reasons)) });
}
