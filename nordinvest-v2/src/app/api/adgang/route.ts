import { NextResponse } from "next/server";
import { confirmationEmail, notifyEmail, storeRequest, validate, type AccessRequest } from "@/lib/access/requests";
import { sendEmail } from "@/lib/email";
import { PITCH_FROM, REPORT_TO } from "@/lib/outreach/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/adgang: an access request from /adgang. Spam is filtered with a
 * hidden field and a minimum fill time. The request is stored and e-mailed;
 * it succeeds if at least one of the two worked, so a lead is never lost.
 * Submitting never grants access.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });

  // Bots fill the hidden field or submit within a second of loading the form.
  const elapsed = Number(body.t) ? Date.now() - Number(body.t) : 0;
  if (body.website || (elapsed > 0 && elapsed < 1500)) return NextResponse.json({ ok: true });

  const { data, errors } = validate(body);
  if (errors) return NextResponse.json({ ok: false, reason: "invalid", errors }, { status: 422 });

  const r: AccessRequest = { ...data!, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: "ny" };
  const n = notifyEmail(r);
  const [stored, notified] = await Promise.all([
    storeRequest(r),
    sendEmail({ to: REPORT_TO, subject: n.subject, html: n.html, replyTo: r.email }).then((x) => x.ok),
  ]);
  if (!stored && !notified) return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });

  // The confirmation is a courtesy; a failure here does not fail the request.
  const c = confirmationEmail(r);
  await sendEmailFrom(r.email, c.subject, c.html);
  return NextResponse.json({ ok: true });
}

async function sendEmailFrom(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: PITCH_FROM, to: [to], reply_to: "contact@nordinvest.io", subject, html }),
  }).catch(() => null);
}
