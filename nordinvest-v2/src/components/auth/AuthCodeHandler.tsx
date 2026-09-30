"use client";

import { useEffect } from "react";
import { loadSupabase } from "@/lib/supabase/lazy";
import { pendingDest } from "@/lib/checkout-intent";

// Some OAuth returns land the ?code= on the site root instead of /auth/callback.
// This catches the code on ANY page, exchanges it for a session, then routes on.
export function AuthCodeHandler() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const errDesc = url.searchParams.get("error_description");

    if (errDesc) {
      window.location.replace("/auth/login?error=" + encodeURIComponent(errDesc));
      return;
    }
    if (!code) return;

    (async () => {
      // Only pages that actually carry an auth code load Supabase.
      const supabase = await loadSupabase();
      if (!supabase) return;
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        window.location.replace("/auth/login?error=auth");
        return;
      }
      let dest = "/velkommen";
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();
        if (profile?.phone) dest = "/dashboard?welcome=1";
      }
      window.location.replace(pendingDest() ?? dest);
    })();
  }, []);

  return null;
}
