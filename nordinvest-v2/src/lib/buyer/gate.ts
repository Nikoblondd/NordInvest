import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Boligkryds is open: the map and the analysis work without an account. An
 * account (a magic link by e-mail) is only needed to keep things: saved
 * homes, mails, sharing. This returns the signed-in person, if any.
 */
export async function buyerUser() {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export const denied = () => NextResponse.json({ ok: false, reason: "login" }, { status: 401, headers: { "Cache-Control": "no-store" } });

/** Where Boligkryds lives, for links in mails. */
export const BOLIGKRYDS_URL = process.env.BOLIGKRYDS_URL ?? "https://boligkryds.nordinvest.io";
