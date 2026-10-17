import { NextResponse } from "next/server";
import { ACCESS_INBOX, confirmationEmail, notifyEmail, storeRequest, validate, type AccessRequest } from "@/lib/access/requests";
import { REPORT_FROM } from "@/lib/outreach/schedule";
import { ACCOUNT_FROM, sendMail } from "@/lib/mail/send";

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
    send(REPORT_FROM, ACCESS_INBOX, n.subject, n.html, r.email),
  ]);
  if (!stored && !notified) return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 503 });

  // The confirmation is a courtesy; a failure here does not fail the request.
  const c = confirmationEmail(r);
  await send(ACCOUNT_FROM, r.email, c.subject, c.html, ACCESS_INBOX);
  return NextResponse.json({ ok: true });
}

async function send(from: string, to: string, subject: string, html: string, replyTo: string): Promise<boolean> {
  return (await sendMail({ from, to, subject, html, replyTo })).ok;
}
