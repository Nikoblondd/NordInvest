/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { effectiveLimit, UNLIMITED } from "@/lib/access";
import { activateEmail, dueEmail, limitEmail, unsubscribeToken, type LifecycleKind } from "@/lib/lifecycle";
import { getDealSnapshot } from "@/lib/deals-snapshot";

/*
 * Daily lifecycle run (Vercel Cron). Finds signed-up users who are due a
 * service email (see lib/lifecycle), sends it through Resend and records it on
 * the user's app_metadata so nobody gets the same message twice.
 * `?dry=1` lists who would get what without sending or recording anything.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";
const MAX_SENDS = 200; // per run, as a safety cap

// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; a manual run passes the same.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || new URL(req.url).searchParams.get("key") === secret;
}

const headers = () => ({ apikey: KEY!, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" });

async function rest(path: string): Promise<any[]> {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`rest ${res.status} ${path.split("?")[0]}`);
  return res.json();
}

async function authUsers(): Promise<Map<string, any>> {
  const out = new Map<string, any>();
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`auth ${res.status}`);
    const j = await res.json();
    const users: any[] = j.users ?? [];
    for (const u of users) out.set(u.id, u);
    if (users.length < 1000) break;
  }
  return out;
}

async function recordSent(user: any, key: string, at: string) {
  const app = user.app_metadata ?? {};
  const lifecycle = { ...(app.lifecycle ?? {}), [key]: at };
  await fetch(`${URL_BASE}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ app_metadata: { ...app, lifecycle } }),
  });
}

export async function GET(req: Request) {
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  // A dry run can also use LIFECYCLE_DRY_KEY: it can list, never send.
  const dryKey = process.env.LIFECYCLE_DRY_KEY;
  const dryAllowed = dry && !!dryKey && req.headers.get("authorization") === `Bearer ${dryKey}`;
  if (!authorized(req) && !dryAllowed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!URL_BASE || !KEY) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const since15d = new Date(now.getTime() - 15 * 86_400_000);
  const earliest = monthStart < since15d ? monthStart : since15d;

  const [profiles, analyses, users] = await Promise.all([
    rest("profiles?select=id,email,full_name,created_at,subscription_tier&limit=5000"),
    rest(`analyses?select=user_id,created_at&created_at=gte.${earliest.toISOString()}&limit=20000`),
    authUsers(),
  ]);

  const month = new Map<string, number>();
  const recent = new Map<string, number>();
  for (const a of analyses) {
    if (!a.user_id) continue;
    const t = new Date(a.created_at);
    if (t >= monthStart) month.set(a.user_id, (month.get(a.user_id) ?? 0) + 1);
    recent.set(a.user_id, (recent.get(a.user_id) ?? 0) + 1);
  }

  let topDeal: { address: string; city: string; cashFlow: number; score: number; href: string } | null = null;
  const plan: { id: string; email: string; kind: LifecycleKind; key: string }[] = [];

  for (const p of profiles) {
    const u = users.get(p.id);
    if (!u || !p.email) continue;
    const app = u.app_metadata ?? {};
    const due = dueEmail(
      {
        createdAt: p.created_at ?? u.created_at,
        tier: p.subscription_tier ?? "free",
        unlimited: effectiveLimit(p.subscription_tier, p.email) >= UNLIMITED,
        // A user who signed up within 14 days has all their analyses in the 15-day window.
        analysesTotal: recent.get(p.id) ?? 0,
        analysesThisMonth: month.get(p.id) ?? 0,
        sent: app.lifecycle ?? {},
        optOut: app.lifecycle_optout === true,
      },
      now,
    );
    if (due) plan.push({ id: p.id, email: p.email, ...due });
  }

  if (dry) {
    const mask = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");
    return NextResponse.json({ dry: true, users: profiles.length, due: plan.map((x) => ({ email: mask(x.email), kind: x.kind })) });
  }

  if (plan.some((x) => x.kind === "activate")) {
    const snap = await getDealSnapshot(null, 1).catch(() => null);
    const d = snap?.top[0];
    if (d) topDeal = { address: d.address, city: d.city, cashFlow: d.cashFlow, score: d.score, href: d.href };
  }

  const results = { sent: 0, failed: 0, reasons: [] as string[] };
  for (const x of plan.slice(0, MAX_SENDS)) {
    const profile = profiles.find((p) => p.id === x.id);
    const unsubUrl = `${SITE}/api/lifecycle/unsubscribe?u=${x.id}&t=${unsubscribeToken(x.id)}`;
    const mail =
      x.kind === "activate"
        ? activateEmail({ name: profile?.full_name ?? null, unsubUrl, topDeal })
        : limitEmail({ name: profile?.full_name ?? null, unsubUrl, resetsOn: nextMonth });
    const res = await sendEmail({ to: x.email, subject: mail.subject, html: mail.html, replyTo: "contact@nordinvest.io" });
    if (res.ok) {
      results.sent++;
      await recordSent(users.get(x.id), x.key, now.toISOString());
    } else {
      results.failed++;
      results.reasons.push(res.reason);
    }
  }
  return NextResponse.json({ users: profiles.length, due: plan.length, ...results, reasons: Array.from(new Set(results.reasons)) });
}
