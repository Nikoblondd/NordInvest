import { NextResponse } from "next/server";
import emails from "@/lib/outreach/press-2026-10-05.json";

/*
 * One-off press outreach, Monday 5 October 2026. A Vercel cron calls this at
 * 08:00 (Danish time); each pitch is queued in Resend for its own time slot
 * between 09:00 and 11:00, from Nikolaj's address with replies to the shared
 * inbox. One mail per news desk, plain text, no tracking. The idempotency key
 * means a second call can never send a pitch twice. Outside the day it does
 * nothing, so the yearly cron re-run is harmless.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FROM = "Nikolaj Blond <contact@nordinvest.io>";
const REPLY_TO = "contact@nordinvest.io";
const DAY = "2026-10-05";

type Pitch = { id: string; to: string; subject: string; text: string; sendAt: string };

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  if (now.toISOString().slice(0, 10) !== DAY) return NextResponse.json({ ok: true, skipped: "not the outreach day" });
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "resend_not_configured" }, { status: 500 });

  const results: { id: string; to: string; at: string; ok: boolean; info: string }[] = [];
  for (const p of emails as Pitch[]) {
    // A slot that has already passed goes out now instead.
    const future = new Date(p.sendAt).getTime() > now.getTime() + 60_000;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `press-${DAY}-${p.id}` },
      body: JSON.stringify({ from: FROM, to: [p.to], reply_to: REPLY_TO, subject: p.subject, text: p.text, ...(future ? { scheduled_at: p.sendAt } : {}) }),
    }).catch((e: Error) => ({ ok: false, json: async () => ({ message: e.message }) }) as Response);
    const data = await res.json().catch(() => ({}));
    results.push({ id: p.id, to: p.to, at: future ? p.sendAt : "now", ok: res.ok, info: res.ok ? data?.id ?? "queued" : data?.message ?? "failed" });
  }

  // Receipt to the founder: what was queued, for when, and anything that failed.
  const admin = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim();
  if (admin) {
    const dkTime = (iso: string) => (iso === "now" ? "nu" : new Date(iso).toLocaleTimeString("da-DK", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit" }));
    const lines = results.map((r) => `${r.ok ? "OK " : "FEJL"}  ${dkTime(r.at)}  ${r.to}${r.ok ? "" : `  (${r.info})`}`).join("\n");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `press-${DAY}-receipt` },
      body: JSON.stringify({
        from: "NordInvest <contact@nordinvest.io>",
        to: [admin],
        subject: `Pressemails sat i kø: ${results.filter((r) => r.ok).length} af ${results.length}`,
        text: `Pressemails fra contact@nordinvest.io i dag. Svar lander i contact@nordinvest.io.\n\n${lines}\n`,
      }),
    }).catch(() => null);
  }
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
