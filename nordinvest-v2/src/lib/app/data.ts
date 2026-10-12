import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/access";
import type { CrmRow } from "@/components/dashboard/Crm";

/* Server-side data for the app pages. RLS keeps every query to the member's own rows. */

export async function appUser() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email, subscription_tier, subscription_status, stripe_customer_id")
    .eq("id", user.id)
    .single();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = (profile?.full_name as string | null) || (meta.full_name as string | undefined) || "";
  return {
    supabase,
    user,
    profile,
    name,
    firstName: name.split(" ")[0] || "",
    admin: isAdmin(user),
    onboarded: !!meta.onboarded || !!profile?.phone,
    tour: (meta.tour as string | undefined) ?? null,
  };
}

/** The member's saved properties (their pipeline), newest first. */
export async function properties(userId: string): Promise<CrmRow[]> {
  const supabase = createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("analyses")
    .select("id, created_at, investment_score, property_url, property_data, analysis_result")
    .eq("user_id", userId)
    .eq("saved_to_portfolio", true)
    .order("created_at", { ascending: false });
  return (data ?? []) as CrmRow[];
}
