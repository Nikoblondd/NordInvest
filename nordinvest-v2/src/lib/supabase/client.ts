import { createBrowserClient } from "@supabase/ssr";

export const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser Supabase client. Returns null when env vars aren't set yet, so the
// UI can degrade gracefully instead of crashing.
export function createClient() {
  if (!supabaseConfigured) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
