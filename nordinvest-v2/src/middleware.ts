import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { persistCookie } from "@/lib/supabase/cookies";

// Public routes that never depend on an authenticated session — running the
// Supabase auth round-trip on these is pure wasted latency (and it fires on
// every crawler/bot hit too, blowing up our request count). We only touch
// auth on paths that actually read the session server-side.
const AUTH_PREFIXES = [
  "/dashboard",
  "/analyseren", // shows plan + usage server-side
  "/priser", // shows current-plan chip when logged in
  "/abonnement",
  "/kvittering",
  "/rapport",
  "/velkommen",
  "/auth",
];

function needsAuth(pathname: string): boolean {
  return AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  // Canonical host: force everything onto the apex domain so auth cookies set
  // on one host aren't invisible on the other (www vs non-www logout bug).
  const host = request.headers.get("host");
  if (host && host.toLowerCase().startsWith("www.")) {
    const target = request.nextUrl.clone();
    target.host = host.slice(4);
    target.port = "";
    return NextResponse.redirect(target, 308);
  }

  // Skip Supabase entirely for anonymous public pages — landing, blog, city
  // hubs, /data, /methodology, /om, /kontakt, legal pages, /glossary, etc.
  // Cuts a full Supabase round-trip off every crawler hit and every anonymous
  // pageview, which is the majority of traffic on a marketing site.
  if (!needsAuth(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, persistCookie(value, options)),
        );
      },
    },
  });

  // Refresh the session so Server Components get a valid token.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
