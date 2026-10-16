import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLink, getAuthUser, updateAppMetadata } from "@/lib/supabase/admin";
import { FIELD, matchLink, parseCode, safeNext } from "@/lib/access/invite-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/invitation (form: code). The button on /invitation/<code>.
 * Checks the durable link, makes a fresh one-time Supabase token on the spot,
 * verifies it here so the session lands in cookies, and sends the person on.
 */
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const form = await req.formData().catch(() => null);
  const code = String(form?.get("code") ?? "");
  const back = (q = "") => NextResponse.redirect(new URL(`/invitation/${encodeURIComponent(code)}${q}`, origin), 303);
  const parsed = parseCode(decodeURIComponent(code));
  if (!parsed) return back();
  const user = await getAuthUser(parsed.userId);
  const match = user ? matchLink(user.app_metadata, parsed.token) : null;
  if (!user?.email || !match) return back();

  const next = safeNext(match.record.next);
  const link = await generateLink(user.email, `${origin}${next}`, undefined, "magiclink");
  if ("error" in link) return back("?fejl=1");
  const supabase = createClient();
  if (!supabase) return back("?fejl=1");
  const { error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: "magiclink" });
  if (error) return back("?fejl=1");

  // A login link works once; an invitation is marked as used (it keeps working for a while after).
  if (match.purpose === "login") await updateAppMetadata(user.id, { [FIELD.login]: null });
  else if (!match.record.used_at) await updateAppMetadata(user.id, { [FIELD.invite]: { ...match.record, used_at: new Date().toISOString() } });

  return NextResponse.redirect(new URL(next, origin), 303);
}
