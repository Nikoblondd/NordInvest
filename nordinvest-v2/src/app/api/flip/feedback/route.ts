import { NextResponse } from "next/server";

/*
 * Feedback from people who ran a flip: did the numbers hit, what was off, and
 * who they are. Works without an account (most first-time flippers have
 * none); stored with the service key in analysis_feedback as property_type
 * "flip" so the rental calibration never reads it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERDICTS: Record<string, number> = { right: 5, arv: 2, reno: 2, missing: 3 };
const ROLES = new Set(["flipper", "considering", "tradesman", "advisor", "other"]);
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false }, { status: 503 });
  const b = await req.json().catch(() => null);
  if (!b || b.website) return NextResponse.json({ ok: true }); // honeypot: bots fill every field
  const verdict = String(b.verdict ?? "");
  if (!(verdict in VERDICTS)) return NextResponse.json({ ok: false, error: "verdict" }, { status: 400 });
  const role = ROLES.has(String(b.role)) ? String(b.role) : "other";
  const email = clip(b.email, 120);
  const comment = [
    `svar: ${verdict}`,
    `rolle: ${role}`,
    clip(b.comment, 1000) && `kommentar: ${clip(b.comment, 1000)}`,
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && `kontakt: ${email}`,
    clip(b.address, 120) && `bolig: ${clip(b.address, 120)}`,
    Number.isFinite(Number(b.profit)) && `fortjeneste: ${Math.round(Number(b.profit))}`,
  ].filter(Boolean).join(" | ");
  const res = await fetch(`${url}/rest/v1/analysis_feedback`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: null, rating: VERDICTS[verdict], region: clip(b.zip, 4) || null, property_type: "flip", comment }),
  });
  return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 502 });
}
