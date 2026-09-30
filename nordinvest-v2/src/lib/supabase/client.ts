import { createBrowserClient } from "@supabase/ssr";

export const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// A SINGLE shared browser client for the whole tab. Creating a new client in
// every component spins up multiple auto-refreshing GoTrue instances that race
// over the rotating refresh token and invalidate each other's session — which
// logs the user out. Memoizing one instance fixes that. (@supabase/ssr already
// writes auth cookies with a 400-day maxAge, so persistence is handled.)
function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

let browserClient: ReturnType<typeof makeClient> | null = null;

export function createClient() {
  if (!supabaseConfigured) return null;
  return (browserClient ??= makeClient());
}
