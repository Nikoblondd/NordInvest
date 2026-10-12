import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * GET /auth/confirm?token_hash=…&type=invite|magiclink&next=/app/velkommen
 * The link in a personal invitation. The one-time token is verified here on
 * the server, which sets the session cookies, and the member lands in the app.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextRaw = url.searchParams.get("next") ?? "/app";
  // Only same-site paths, never an open redirect.
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/app";
  const fail = NextResponse.redirect(new URL("/auth/login?fejl=link", url.origin));
  if (!token_hash || (type !== "invite" && type !== "magiclink")) return fail;
  const supabase = createClient();
  if (!supabase) return fail;
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });
  if (error) return fail;
  return NextResponse.redirect(new URL(next, url.origin));
}
