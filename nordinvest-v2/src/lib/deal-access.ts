import { createClient } from "@/lib/supabase/server";
import { effectiveLimit } from "@/lib/access";
import { limits } from "@/lib/pricing";
import type { DealAccess } from "@/lib/deal-tiers";

/*
 * Server side: which Deal-motor tier this request gets. Our own crons (Deal-
 * vagt) call the search with CRON_SECRET and get everything. A paid plan, or
 * an admin account, counts as paid.
 */
export async function dealAccess(req: Request): Promise<DealAccess> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return "paid";
  const supabase = createClient();
  if (!supabase) return "anon";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "anon";
  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
  return effectiveLimit(profile?.subscription_tier, user.email, user) > limits.free ? "paid" : "free";
}
