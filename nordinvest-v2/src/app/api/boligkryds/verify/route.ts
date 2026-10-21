import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLink, getAuthUser, updateAppMetadata } from "@/lib/supabase/admin";
import { LOGIN_FIELD, loginMatches, parseLoginCode, safePath } from "@/lib/buyer/login";
import { originOf } from "@/lib/buyer/login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/boligkryds/verify (form: code): signs the person in from a login link and sends them back to the map. */
export async function POST(req: Request) {
  const origin = originOf(req);
  const form = await req.formData().catch(() => null);
  const code = String(form?.get("code") ?? "");
  const fail = () => NextResponse.redirect(new URL(`/login/${encodeURIComponent(code)}?fejl=1`, origin), 303);
  const parsed = parseLoginCode(decodeURIComponent(code));
  if (!parsed) return fail();
  const user = await getAuthUser(parsed.userId);
  const rec = user ? loginMatches(user.app_metadata, parsed.token) : null;
  if (!user?.email || !rec) return fail();

  const link = await generateLink(user.email, `${origin}/`, undefined, "magiclink");
  if ("error" in link) return fail();
  const supabase = createClient();
  if (!supabase) return fail();
  const { error } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: "magiclink" });
  if (error) return fail();
  await updateAppMetadata(user.id, { [LOGIN_FIELD]: null, boligkryds: true });
  const next = safePath(rec.next);
  return NextResponse.redirect(new URL(`${next}${next.includes("?") ? "&" : "?"}velkommen=1`, origin), 303);
}
