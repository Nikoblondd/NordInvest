import { NextResponse } from "next/server";
import { getMarket } from "@/lib/buyer/market";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * GET /api/boligkoeb/pulse: how fresh the map is. When the market agent last
 * finished a sweep of every home for sale (its own run log), what moved in the
 * last day and which estate agents the homes come from. Small, and asked for
 * every minute or so by the map to keep "opdateret for 3 min. siden" true.
 */
let last: { at: number; run: { finished_at: string; seen: number } | null } | null = null;

async function lastRun() {
  if (last && Date.now() - last.at < 30_000) return last.run;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const run = await fetch(`${base}/rest/v1/agent_runs?select=finished_at,seen&ok=eq.true&order=finished_at.desc&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" })
    .then((r) => (r.ok ? r.json() : [])).then((r) => (r as { finished_at: string; seen: number }[])[0] ?? null).catch(() => null);
  last = { at: Date.now(), run };
  return run;
}

export async function GET() {
  const [m, run] = await Promise.all([getMarket(), lastRun()]);
  if (!m) return NextResponse.json({ ok: false }, { status: 503 });
  return NextResponse.json({ ok: true, checkedAt: run?.finished_at ?? new Date(m.builtAt).toISOString(), everyMin: 20, ...m.pulse }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
