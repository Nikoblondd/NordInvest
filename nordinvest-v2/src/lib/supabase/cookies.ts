import type { CookieOptions } from "@supabase/ssr";

// Keep users signed in across browser restarts: give auth cookies a long
// max-age. Leave deletions (empty value, or an explicit maxAge/expires that
// Supabase sets on sign-out) untouched so logging out still works.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 400; // ~400 days

export function persistCookie(value: string, options: CookieOptions = {}): CookieOptions {
  if (!value) return options;
  if (options.maxAge != null || options.expires != null) return options;
  return { ...options, maxAge: SESSION_MAX_AGE };
}
