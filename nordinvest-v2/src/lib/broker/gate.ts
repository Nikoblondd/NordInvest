import { createClient } from "@/lib/supabase/server";
import { hasBrokerAccess, isAdmin } from "@/lib/access";

/** The signed-in agent (or admin) for the broker tools, or null. */
export async function brokerUser() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !hasBrokerAccess(user)) return null;
  return { user, admin: isAdmin(user) };
}
