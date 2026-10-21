import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasBuyerAccess } from "@/lib/access";

/** The signed-in person, when they may use the home buyer's map (private buyers, members, admins). */
export async function buyerUser() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user && hasBuyerAccess(user) ? user : null;
}

export const denied = () => NextResponse.json({ ok: false, reason: "no_access" }, { status: 403, headers: { "Cache-Control": "no-store" } });
