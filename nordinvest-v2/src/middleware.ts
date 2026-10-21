import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { persistCookie } from "@/lib/supabase/cookies";

// Public routes that never depend on an authenticated session — running the
// Supabase auth round-trip on these is pure wasted latency (and it fires on
// every crawler/bot hit too, blowing up our request count). We only touch
// auth on paths that actually read the session server-side.
const AUTH_PREFIXES = [
  "/app",
  "/dashboard",
  "/analyseren", // shows plan + usage server-side
  "/priser", // shows current-plan chip when logged in
  "/abonnement",
  "/konto",
  "/kvittering",
  "/rapport",
  "/velkommen",
  "/auth",
  "/maegler",
];

/*
 * Boligkryds lives on its own host (boligkryds.nordinvest.io, and
 * boligkryds.localhost in development). Every page there is served from
 * /boligkryds/* in this app. On NordInvest's own host those pages don't
 * exist; old links to the buyer pages go to Boligkryds.
 */
const BK_PREFIX = "/boligkryds";
const isBoligkrydsHost = (host: string | null) => !!host && host.toLowerCase().startsWith("boligkryds.");
const OLD_BUYER_PATHS: Record<string, string> = { "/boligkoeb": "/", "/boligkoeber": "/", "/hvad-kan-jeg-laane": "/hvad-kan-jeg-laane" };
function boligkrydsOrigin(host: string): string {
  return host.includes("localhost") ? `http://boligkryds.${host.replace(/^www\./, "")}` : "https://boligkryds.nordinvest.io";
}

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

  const path = request.nextUrl.pathname;
  const bk = isBoligkrydsHost(host);
  if (!bk && host) {
    const old = OLD_BUYER_PATHS[path] ?? (path === BK_PREFIX || path.startsWith(`${BK_PREFIX}/`) ? path.slice(BK_PREFIX.length) || "/" : null);
    if (old) return NextResponse.redirect(new URL(`${old}${request.nextUrl.search}`, boligkrydsOrigin(host)), 308);
  }

  // Skip Supabase entirely for anonymous public pages — landing, blog, city
  // hubs, /data, /methodology, /om, /kontakt, legal pages, /glossary, etc.
  // Cuts a full Supabase round-trip off every crawler hit and every anonymous
  // pageview, which is the majority of traffic on a marketing site.
  if (!bk && !needsAuth(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // The page asked for, so a login redirect can come back to it (with query).
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set("x-ni-path", request.nextUrl.pathname + request.nextUrl.search);
    if (bk) {
      const url = request.nextUrl.clone();
      if (!(url.pathname === BK_PREFIX || url.pathname.startsWith(`${BK_PREFIX}/`))) url.pathname = `${BK_PREFIX}${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url, { request: { headers } });
    }
    return NextResponse.next({ request: { headers } });
  };
  let response = forward();

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
        response = forward();
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
