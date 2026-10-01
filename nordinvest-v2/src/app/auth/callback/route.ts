import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { persistCookie } from "@/lib/supabase/cookies";
import { CHECKOUT_COOKIE, RETURN_COOKIE, checkoutDest, safeReturn } from "@/lib/checkout-intent";

// OAuth + magic-link return here. We exchange the code for a session and MUST
// carry the resulting Set-Cookie headers onto the redirect response — otherwise
// the browser is redirected without the session and the user looks logged out.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!code || !url || !key) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
  }

  // Collect cookies written during the exchange on this response, then copy
  // them onto whatever redirect we ultimately return.
  const collector = NextResponse.next();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          collector.cookies.set(name, value, persistCookie(value, options)),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dest = "/velkommen";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();
    if (profile?.phone || user.user_metadata?.onboarded) dest = "/dashboard?welcome=1";
  }

  // Came here from a "Køb <plan>" button: finish the purchase first.
  // Stopped mid-analysis by the signup gate: back to that analysis.
  const back = safeReturn(request.cookies.get(RETURN_COOKIE)?.value);
  dest = checkoutDest(request.cookies.get(CHECKOUT_COOKIE)?.value) ?? back ?? dest;

  const redirect = NextResponse.redirect(`${origin}${dest}`);
  if (back) redirect.cookies.set(RETURN_COOKIE, "", { maxAge: 0, path: "/" });
  collector.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
