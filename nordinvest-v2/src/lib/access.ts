import { limits, type Tier } from "@/lib/pricing";

// Server-side admin allowlist. Emails in the ADMIN_EMAILS env var (comma-
// separated) get unlimited analyses regardless of their subscription tier —
// used for the owner's own testing account. Never exposed to the client bundle.
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const list = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}

/*
 * Tool and admin access. Email alone is not enough: sign-ups are open and
 * e-mails are auto-confirmed in Supabase, so someone could register an
 * allowlisted address that has no account yet. Only allowlisted accounts that
 * existed before the platform closed count; a new account never qualifies.
 */
const ADMIN_ACCOUNTS_BEFORE = Date.parse("2026-10-12T00:00:00Z");

export function isAdmin(user?: { email?: string | null; created_at?: string | null } | null): boolean {
  if (!user || !isAdminEmail(user.email)) return false;
  const created = Date.parse(user.created_at ?? "");
  return Number.isFinite(created) && created < ADMIN_ACCOUNTS_BEFORE;
}

export const UNLIMITED = 999999;

// The monthly analysis limit that actually applies to a user: their plan's
// limit, or unlimited for an admin account.
export function effectiveLimit(
  tier: Tier["id"] | string | null | undefined,
  email?: string | null,
): number {
  if (isAdminEmail(email)) return UNLIMITED;
  const t = (tier ?? "free") as Tier["id"];
  return limits[t] ?? 3;
}
