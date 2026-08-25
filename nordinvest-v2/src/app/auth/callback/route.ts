import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth + magic-link return here. Exchange the code for a session, then send
// first-time users to /velkommen to capture their phone number.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const supabase = createClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();
        const dest = profile?.phone ? "/dashboard" : "/velkommen";
        return NextResponse.redirect(`${origin}${dest}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth`);
}
