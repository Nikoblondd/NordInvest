import { NextResponse } from "next/server";
import { OUTREACH_PAUSED, PITCH_FROM, PITCH_REPLY_TO, REPORT_FROM, REPORT_TO, dkDay, dkTime, pitchesOn } from "@/lib/outreach/schedule";

/*
 * Press outreach. A Vercel cron calls this at 08:00 Danish time every
 * weekday; it queues that day's pitches in Resend, each at its own
 * time between 09:00 and 11:00, from Nikolaj's address with replies to the
 * shared inbox. One mail per journalist or desk, plain text, no tracking. Idempotency
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
  // Stopped: no outreach is sent until deliverability is fixed and it is switched on again by hand.
  if (OUTREACH_PAUSED) return NextResponse.json({ ok: true, skipped: "outreach paused" });
  const now = new Date();
  const day = dkDay(now);
  const todays = pitchesOn(day);
  if (todays.length === 0) return NextResponse.json({ ok: true, skipped: `no pitches on ${day}` });
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "resend_not_configured" }, { status: 500 });

  const results: { id: string; to: string; at: string; ok: boolean; info: string }[] = [];
  // Resend allows 10 requests a second; pause between calls and retry once on 429.
  const send = async (p: (typeof todays)[number], future: boolean) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `press-${p.id}-${day}` },
        body: JSON.stringify({ from: PITCH_FROM, to: [p.to], reply_to: PITCH_REPLY_TO, subject: p.subject, text: p.text, ...(future ? { scheduled_at: p.sendAt } : {}) }),
      }).catch((e: Error) => ({ ok: false, status: 0, json: async () => ({ message: e.message }) }) as Response);
      if (res.status !== 429) return res;
      await new Promise((r) => setTimeout(r, 1500));
    }
    return { ok: false, json: async () => ({ message: "rate limited three times" }) } as Response;
  };
  for (const p of todays) {
    const future = new Date(p.sendAt).getTime() > now.getTime() + 60_000;
    const res = await send(p, future);
    const data = await res.json().catch(() => ({}));
    results.push({ id: p.id, to: p.to, at: future ? p.sendAt : now.toISOString(), ok: res.ok, info: res.ok ? data?.id ?? "queued" : data?.message ?? "failed" });
    await new Promise((r) => setTimeout(r, 250));
  }

  const lines = results.map((r) => `${r.ok ? "OK  " : "FEJL"}  ${dkTime(r.at)}  ${r.to}${r.ok ? "" : `  (${r.info})`}`).join("\n");
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `press-receipt-${day}` },
    body: JSON.stringify({
      from: REPORT_FROM,
      to: [REPORT_TO],
      subject: `Udsendte mails i dag: ${results.filter((r) => r.ok).length} af ${results.length} sat i kø`,
      text: `Dagens mails sendes fra contact@nordinvest.io på disse tidspunkter. Svar lander i contact@nordinvest.io.\n\n${lines}\n\nDu får dagsrapporten kl. 17.`,
    }),
  }).catch(() => null);
  return NextResponse.json({ ok: results.every((r) => r.ok), day, results });
}
