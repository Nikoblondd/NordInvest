import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { effectiveLimit, UNLIMITED } from "@/lib/access";
import { gateApi } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfMonthISO(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// Shared context: the authenticated user, their effective monthly limit
// (unlimited for admin accounts) and how many analyses they've run this month.
async function usageContext() {
  const supabase = createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();
  const max = effectiveLimit(profile?.subscription_tier, user.email);
  const { count } = await supabase
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonthISO());
  return { supabase, user, used: count ?? 0, max, unlimited: max >= UNLIMITED };
}

// GET — current usage/limit for the signed-in user (drives the save gate).
export async function GET(req: Request) {
  const denied = await gateApi(req);
  if (denied) return denied;
  const ctx = await usageContext();
  if (!ctx) return NextResponse.json({ ok: false, authenticated: false });
  return NextResponse.json({
    ok: true,
    authenticated: true,
    used: ctx.used,
    max: ctx.max,
    unlimited: ctx.unlimited,
  });
}

const STRATEGIES = new Set(["cashflow", "appreciation", "value_add"]);

// POST — log a single analysis run. Every analysis counts toward the month,
// whether or not it's saved to the portfolio. Returns the row id so the save
// flow can flip THIS row to saved_to_portfolio (no double-count).
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  const denied = await gateApi(req);
  if (denied) return denied;
  const ctx = await usageContext();
  if (!ctx) return NextResponse.json({ ok: false, authenticated: false });
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const { supabase, user } = ctx;
  // Enforce the monthly free-analysis limit on the core action itself (not just
  // on saving) — this is what makes the willingness-to-pay test real. A blocked
  // run is NOT inserted, so it never consumes quota; the client shows the
  // paywall. Admins/paid tiers pass through until their own limit.
  if (!ctx.unlimited && ctx.used >= ctx.max) {
    return NextResponse.json({ ok: true, over: true, id: null, used: ctx.used, max: ctx.max, unlimited: false });
  }
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      user_id: user.id,
      property_url: typeof body.address === "string" ? body.address : null,
      property_data:
        body.propertyData && typeof body.propertyData === "object"
          ? body.propertyData
          : { address: body.address ?? null },
      strategy: STRATEGIES.has(body.strategy) ? body.strategy : null,
      investment_score: Number.isFinite(body.score) ? Math.round(body.score) : null,
      verdict: typeof body.verdict === "string" ? body.verdict : null,
      saved_to_portfolio: false,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message });
  return NextResponse.json({
    ok: true,
    over: false,
    id: data?.id ?? null,
    used: ctx.used + 1,
    max: ctx.max,
    unlimited: ctx.unlimited,
  });
}
