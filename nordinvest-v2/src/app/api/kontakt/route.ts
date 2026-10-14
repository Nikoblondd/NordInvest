import { NextResponse } from "next/server";
import { topicLabel, validateContact } from "@/lib/contact";
import { REPORT_FROM } from "@/lib/outreach/schedule";
import { site } from "@/lib/site";
import { toolUser } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/kontakt: a message from the contact form. It goes straight to
 * contact@nordinvest.io with the sender as reply-to, so answering is one click
 * in the inbox. The sender gets a short receipt. Spam is filtered with a
 * hidden field and a minimum fill time.
 */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  const elapsed = Number(body.t) ? Date.now() - Number(body.t) : 0;
  if (body.website || (elapsed > 0 && elapsed < 2000)) return NextResponse.json({ ok: true });

  const { data, errors } = validateContact(body);
  if (!data) return NextResponse.json({ ok: false, reason: "invalid", errors }, { status: 422 });

  const member = await toolUser().catch(() => null);
  const topic = topicLabel(data.topic);
  const first = data.message.split("\n")[0].slice(0, 70);
  const rows: [string, string][] = [
    ["Emne", topic],
    ["Fra", `${esc(data.name)} &lt;${esc(data.email)}&gt;`],
    ["Medlem", member ? "Ja" : "Nej"],
    ...(data.page ? [["Side", esc(data.page)] as [string, string]] : []),
  ];
  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:600px;color:#0f172a;font-size:15px;line-height:1.6">
<table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">${rows.map(([k, v]) => `<tr><td style="padding:2px 16px 2px 0;color:#64748b">${k}</td><td>${v}</td></tr>`).join("")}</table>
<div style="white-space:pre-wrap;border-top:1px solid #e2e8f0;padding-top:16px">${esc(data.message)}</div>
<p style="font-size:12px;color:#94a3b8;margin-top:24px">Svar på denne mail for at svare afsenderen.</p></div>`;

  const sent = await send({ from: REPORT_FROM, to: site.email, replyTo: data.email, subject: `[${topic}] ${first}`, html });
  if (!sent) return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });

  // The receipt is a courtesy; a failure here does not fail the message.
  await send({
    from: REPORT_FROM,
    to: data.email,
    replyTo: site.email,
    subject: "Vi har modtaget din besked",
    html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;color:#0f172a;font-size:15px;line-height:1.6">
<p>Hej ${esc(data.name.split(" ")[0])}</p>
<p>Tak for din besked om <b>${esc(topic.toLowerCase())}</b>. Vi svarer typisk inden for en arbejdsdag.</p>
<p style="white-space:pre-wrap;color:#475569;border-left:3px solid #e2e8f0;padding-left:12px">${esc(data.message)}</p>
<p>Venlig hilsen<br>NordInvest<br>${site.email}</p></div>`,
  });
  return NextResponse.json({ ok: true });
}

async function send(m: { from: string; to: string; replyTo: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: m.from, to: [m.to], reply_to: m.replyTo, subject: m.subject, html: m.html }),
  }).then((r) => r.ok).catch(() => false);
}
