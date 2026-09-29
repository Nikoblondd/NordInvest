// Loads the Supabase browser client only when it's needed. supabase-js is the
// biggest script on the site (~55 KB gzipped); most visitors aren't logged in,
// so the header and other always-present components shouldn't pay for it.

/** True when the browser holds a Supabase session cookie (sb-<ref>-auth-token, possibly chunked). */
export function hasAuthCookie(): boolean {
  return typeof document !== "undefined" && /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/.test(document.cookie);
}

/** The shared browser client, imported on demand. */
export async function loadSupabase() {
  const { createClient } = await import("./client");
  return createClient();
}

