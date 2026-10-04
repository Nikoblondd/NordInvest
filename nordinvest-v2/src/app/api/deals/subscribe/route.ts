import { NextResponse } from "next/server";
import { dealCity } from "@/lib/deal-cities";
import { confirmToken, validEmail } from "@/lib/deal-subscribe";
import { cityConfirmEmail } from "@/lib/deals-email";
import { sendEmail } from "@/lib/email";

/*
 * Signup for "Månedens bedste køb i <by>". Nothing is stored here: the visitor
 * gets a confirmation email, and only the signed link in it creates the
 * subscription (double opt-in). A hidden honeypot field stops simple bots.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; kommune?: string; consent?: boolean; website?: string };
  if (body.website) return NextResponse.json({ ok: true }); // bot: pretend it worked
  const email = String(body.email ?? "").trim().toLowerCase();
  const c = dealCity(String(body.kommune ?? ""));
  if (!c) return NextResponse.json({ ok: false, error: "Ukendt kommune." }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ ok: false, error: "Skriv en gyldig mailadresse." }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ ok: false, error: "Sæt flueben for at give samtykke." }, { status: 400 });

  const token = confirmToken({ e: email, k: c.slug, t: Date.now() });
  const mail = cityConfirmEmail({ cityName: c.name, cityIn: c.in, confirmUrl: `${SITE}/api/deals/subscribe/confirm?t=${encodeURIComponent(token)}` });
  const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html, replyTo: "contact@nordinvest.io" });
  if (!sent.ok) return NextResponse.json({ ok: false, error: "Mailen kunne ikke sendes lige nu. Prøv igen om lidt." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
