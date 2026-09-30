import { NextResponse } from "next/server";
import { sendEmail, vagtAlertEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected email deliverability check. Usage:
//   /api/vagt/test-email?key=CRON_SECRET&to=you@example.com
// Sends a sample Vagt alert so we can confirm end-to-end delivery before launch.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || url.searchParams.get("key") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const to = url.searchParams.get("to");
  if (!to) return NextResponse.json({ ok: false, error: "missing_to" }, { status: 400 });

  const { subject, html } = vagtAlertEmail({
    name: null,
    address: "Testvej 12, 2100 København Ø",
    alert: "Prisen faldt fra 4.300.000 til 4.050.000 kr (−5,8 %). Score nu 62/100.",
    currentPrice: 4_050_000,
    currentScore: 62,
    listingUrl: "https://www.nybolig.dk/",
  });

  const result = await sendEmail({ to, subject, html });
  return NextResponse.json({ ...result, from: process.env.EMAIL_FROM ?? "onboarding@resend.dev", configured: !!process.env.RESEND_API_KEY });
}
