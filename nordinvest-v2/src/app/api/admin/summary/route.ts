import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/access";
import { getAnalytics } from "@/lib/analytics-data";

/*
 * Aggregate traction numbers (no names, emails or per-user rows) for the
 * founder's deck and metrics dashboard. Admin session, or the read-only
 * `Authorization: Bearer <LIFECYCLE_DRY_KEY>` for scripts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function allowed(req: Request): Promise<boolean> {
  const readKey = process.env.LIFECYCLE_DRY_KEY;
  if (readKey && req.headers.get("authorization") === `Bearer ${readKey}`) return true;
  const supabase = createClient();
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  return !!user && isAdminEmail(user.email);
}

export async function GET(req: Request) {
  if (!(await allowed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { users, ...a } = await getAnalytics();
  const withAnalysis = users.filter((u) => u.analyses > 0).length;
  return NextResponse.json(
    { ...a, usersWithAnalysis: withAnalysis, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
