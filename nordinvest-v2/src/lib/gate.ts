import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/access";

/*
 * The closed platform's gate. The tools (analyser, Deal-motor, ejendomsmappe,
 * CRM, bank report) and every API behind them open only for accounts on the
 * ADMIN_EMAILS allowlist, checked on the server for each request. Having an
 * account, a submitted access request or a direct link gives nothing.
 * Scheduled jobs pass with the CRON_SECRET bearer that Vercel sends.
 */

export async function toolUser() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user && isAdmin(user) ? user : null;
}

export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

/** For API routes: returns a 403 response to send back, or null when the caller may proceed. */
export async function gateApi(req: Request): Promise<NextResponse | null> {
  if (cronAuthorized(req)) return null;
  if (await toolUser()) return null;
  return NextResponse.json({ ok: false, reason: "no_access" }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
