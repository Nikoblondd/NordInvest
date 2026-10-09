import { NextResponse } from "next/server";
import mails from "@/lib/outreach/maegler-uge-42.json";
import { PITCH_FROM, PITCH_REPLY_TO, REPORT_FROM, REPORT_TO, dkTime } from "@/lib/outreach/schedule";

/*
 * One personal mail to each of 19 erhvervsmæglere with a short link to the
 * analysis of their own listing (nordinvest.io/e/<slug>) and an offer of a
 * free 15-minute meeting. Calling this queues every mail in Resend at its own
 * time on Monday 12 October between 08:30 and 11:00. It only works until the
 * QUEUE_BEFORE cutoff, and idempotency keys mean a repeated call inside that
 * window can never send a mail twice.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Mail = { id: string; to: string; subject: string; text: string; sendAt: string };
const MAILS = mails as Mail[];
const QUEUE_BEFORE = Date.parse("2026-10-10T02:00:00Z");

export async function GET() {
  if (Date.now() > QUEUE_BEFORE) return NextResponse.json({ ok: false, error: "closed" }, { status: 410 });
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "resend_not_configured" }, { status: 500 });

  const results: { id: string; to: string; at: string; ok: boolean; info: string }[] = [];
  for (const m of MAILS) {
    let res: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `maegler-${m.id}` },
        body: JSON.stringify({ from: PITCH_FROM, to: [m.to], reply_to: PITCH_REPLY_TO, subject: m.subject, text: m.text, scheduled_at: m.sendAt }),
      }).catch(() => null);
      if (res && res.status !== 429) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
    const data = res ? await res.json().catch(() => ({})) : {};
    results.push({ id: m.id, to: m.to, at: m.sendAt, ok: !!res?.ok, info: res?.ok ? data?.id ?? "queued" : data?.message ?? "failed" });
    await new Promise((r) => setTimeout(r, 250));
  }

  const lines = results.map((r) => `${r.ok ? "OK  " : "FEJL"}  man. ${dkTime(r.at)}  ${r.to}  nordinvest.io/e/${r.id}${r.ok ? "" : `  (${r.info})`}`).join("\n");
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": "maegler-receipt-uge-42" },
    body: JSON.stringify({
      from: REPORT_FROM,
      to: [REPORT_TO],
      subject: `Mæglermails: ${results.filter((r) => r.ok).length} af ${results.length} planlagt til mandag`,
      text: `De personlige mails til erhvervsmæglerne går ud mandag fra contact@nordinvest.io. Svar lander i contact@nordinvest.io.\n\n${lines}`,
    }),
  }).catch(() => null);
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
