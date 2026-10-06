/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { PITCHES, REPORT_FROM, REPORT_TO, dkDay, dkTime, pitchesOn } from "@/lib/outreach/schedule";

/*
 * The founder's daily report, 17:00 Danish time, from contact@nordinvest.io
 * to Nikolaj's own inbox: today's press pitches and whether each one was
 * delivered, tomorrow's plan, and the day's numbers (signups, analyses, city
 * subscribers, paying customers). Replies from journalists go to the shared
 * inbox, which this cannot read, so the report says so.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const db = (path: string, count = false) =>
  fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, ...(count ? { Prefer: "count=exact", Range: "0-0" } : {}) },
    cache: "no-store",
  });
const countOf = async (path: string) => {
  const r = await db(path, true).catch(() => null);
  const n = Number(r?.headers.get("content-range")?.split("/")[1]);
  return Number.isFinite(n) ? n : null;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "resend_not_configured" }, { status: 500 });
  const now = new Date();
  const day = dkDay(now);
  const tomorrow = dkDay(new Date(now.getTime() + 864e5));
  const since = new Date(now.getTime() - 864e5).toISOString();

  // Delivery status of today's pitches, from Resend's list of sent emails.
  const sent: any[] = await fetch("https://api.resend.com/emails?limit=100", { headers: { Authorization: `Bearer ${key}` } })
    .then((r) => (r.ok ? r.json() : { data: [] }))
    .then((j) => j?.data ?? [])
    .catch(() => []);
  const status = (to: string, subject: string) => {
    const m = sent.find((e) => (Array.isArray(e.to) ? e.to.includes(to) : e.to === to) && e.subject === subject);
    const ev = m?.last_event as string | undefined;
    const word: Record<string, string> = { delivered: "leveret", sent: "sendt", scheduled: "i kø", bounced: "AFVIST", complained: "markeret som spam", opened: "leveret", clicked: "leveret", delivery_delayed: "forsinket", failed: "FEJLET" };
    return ev ? word[ev] ?? ev : "ukendt";
  };
  const today = pitchesOn(day).map((p) => `${dkTime(p.sendAt)}  ${p.to}  ${status(p.to, p.subject)}\n        ${p.subject}`);
  const next = pitchesOn(tomorrow).map((p) => `${dkTime(p.sendAt)}  ${p.to}\n        ${p.subject}`);
  const doneTotal = PITCHES.filter((p) => new Date(p.sendAt) <= now).length;

  // Numbers.
  const users: any[] = [];
  if (URL_BASE && KEY) {
    for (let page = 1; page <= 10; page++) {
      const r = await fetch(`${URL_BASE}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: "no-store" }).catch(() => null);
      const list: any[] = (await r?.json().catch(() => null))?.users ?? [];
      users.push(...list);
      if (list.length < 1000) break;
    }
  }
  const newUsers = users.filter((u) => u.created_at >= since).length;
  const [analyses24, analysesAll, subsAll, subs24, paying] = await Promise.all([
    countOf(`analyses?select=id&created_at=gte.${since}`),
    countOf("analyses?select=id"),
    countOf("deal_subscribers?select=id&confirmed_at=not.is.null&unsubscribed_at=is.null"),
    countOf(`deal_subscribers?select=id&confirmed_at=gte.${since}`),
    countOf("profiles?select=id&subscription_tier=neq.free&subscription_status=eq.active"),
  ]);
  const n = (v: number | null) => (v == null ? "–" : v.toLocaleString("da-DK"));

  const text = [
    `Dagsrapport ${new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", weekday: "long", day: "numeric", month: "long" }).format(now)}`,
    "",
    "TAL (sidste 24 timer)",
    `Nye brugere:          ${n(newUsers)}  (i alt ${n(users.length)})`,
    `Analyser:             ${n(analyses24)}  (i alt ${n(analysesAll)})`,
    `Nye by-abonnenter:    ${n(subs24)}  (aktive i alt ${n(subsAll)})`,
    `Betalende kunder:     ${n(paying)}`,
    "",
    `PRESSEMAILS I DAG (${today.length})`,
    today.length ? today.join("\n") : "Ingen i dag.",
    "",
    `I MORGEN (${next.length})`,
    next.length ? next.join("\n") : "Ingen planlagt.",
    "",
    `Sendt i alt i pressekampagnen: ${doneTotal} af ${PITCHES.length} (sidste udsendelse ${dkDay(new Date(PITCHES[PITCHES.length - 1].sendAt))}).`,
    "Svar fra journalister lander i contact@nordinvest.io. Den indbakke kan jeg ikke se, så tjek den, og svar hurtigt.",
    "",
    "NordInvest",
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `daily-report-${day}` },
    body: JSON.stringify({ from: REPORT_FROM, to: [REPORT_TO], subject: `NordInvest dagsrapport ${day}: ${n(newUsers)} nye brugere, ${n(analyses24)} analyser`, text }),
  });
  return NextResponse.json({ ok: res.ok, day });
}
