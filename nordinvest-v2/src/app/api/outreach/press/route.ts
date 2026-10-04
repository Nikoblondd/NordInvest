import { NextResponse } from "next/server";
import { PITCH_FROM, PITCH_REPLY_TO, REPORT_FROM, REPORT_TO, dkDay, dkTime, pitchesOn } from "@/lib/outreach/schedule";

/*
 * Press outreach, week 41. A Vercel cron calls this at 08:00 Danish time,
 * Monday to Friday; it queues that day's pitches in Resend, each at its own
 * time between 09:00 and 11:00, from Nikolaj's address with replies to the
 * shared inbox. One mail per news desk, plain text, no tracking. Idempotency
 * keys mean a repeated call can never send a pitch twice. On days without
 * pitches it does nothing.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const day = dkDay(now);
  const todays = pitchesOn(day);
  if (todays.length === 0) return NextResponse.json({ ok: true, skipped: `no pitches on ${day}` });
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "resend_not_configured" }, { status: 500 });

  const results: { id: string; to: string; at: string; ok: boolean; info: string }[] = [];
  for (const p of todays) {
    const future = new Date(p.sendAt).getTime() > now.getTime() + 60_000;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `press-${p.id}-${day}` },
      body: JSON.stringify({ from: PITCH_FROM, to: [p.to], reply_to: PITCH_REPLY_TO, subject: p.subject, text: p.text, ...(future ? { scheduled_at: p.sendAt } : {}) }),
    }).catch((e: Error) => ({ ok: false, json: async () => ({ message: e.message }) }) as Response);
    const data = await res.json().catch(() => ({}));
    results.push({ id: p.id, to: p.to, at: future ? p.sendAt : now.toISOString(), ok: res.ok, info: res.ok ? data?.id ?? "queued" : data?.message ?? "failed" });
  }

  const lines = results.map((r) => `${r.ok ? "OK  " : "FEJL"}  ${dkTime(r.at)}  ${r.to}${r.ok ? "" : `  (${r.info})`}`).join("\n");
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `press-receipt-${day}` },
    body: JSON.stringify({
      from: REPORT_FROM,
      to: [REPORT_TO],
      subject: `Pressemails i dag: ${results.filter((r) => r.ok).length} af ${results.length} sat i kø`,
      text: `Dagens pressemails sendes fra contact@nordinvest.io på disse tidspunkter. Svar lander i contact@nordinvest.io.\n\n${lines}\n\nDu får dagsrapporten kl. 17.`,
    }),
  }).catch(() => null);
  return NextResponse.json({ ok: results.every((r) => r.ok), day, results });
}
