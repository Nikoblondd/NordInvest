"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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

    const supabase = createClient();
    if (!supabase) return;

    (async () => {
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
        if (profile?.phone) dest = "/dashboard";
      }
      window.location.replace(dest);
    })();
  }, []);

  return null;
}
