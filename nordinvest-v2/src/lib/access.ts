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
 * Tool and admin access. An admin is either an account an admin has marked
 * with app_metadata.nordinvest_role = "admin", or an allowlisted e-mail.
 * Email alone is not enough: sign-ups are open and
 * e-mails are auto-confirmed in Supabase, so someone could register an
 * allowlisted address that has no account yet. Only allowlisted accounts that
 * existed before the platform closed count; a new account never qualifies.
 */
const ADMIN_ACCOUNTS_BEFORE = Date.parse("2026-10-12T00:00:00Z");

export function isAdmin(user?: { email?: string | null; created_at?: string | null; app_metadata?: Record<string, unknown> | null } | null): boolean {
  if (!user) return false;
  // Granted on the account itself by another admin (service role only).
  if (user.app_metadata?.nordinvest_role === "admin" && user.app_metadata?.nordinvest_access !== "revoked") return true;
  if (!isAdminEmail(user.email)) return false;
  const created = Date.parse(user.created_at ?? "");
  return Number.isFinite(created) && created < ADMIN_ACCOUNTS_BEFORE;
}

/*
 * Member access is set by an admin on the account's app_metadata (which only
 * the service role can write, never the user): { nordinvest_access: "member" }.
 * "revoked" closes it again.
 */
type AccessUser = { email?: string | null; created_at?: string | null; app_metadata?: Record<string, unknown> | null } | null | undefined;

export function isMember(user: AccessUser): boolean {
  return user?.app_metadata?.nordinvest_access === "member";
}

/** An estate agent with access to the broker tools only (investor analyses for their own listings). */
export function isBroker(user: AccessUser): boolean {
  return user?.app_metadata?.nordinvest_access === "maegler";
}

/** A private home buyer: the map, the buyer analysis and saved homes, not the investor tools. */
export function isPrivate(user: AccessUser): boolean {
  return user?.app_metadata?.nordinvest_access === "privat";
}

/** A member who was also given the home buyer's map (invited or switched to "investor og boligkøber"). */
export function isMemberPrivate(user: AccessUser): boolean {
  return isMember(user) && user?.app_metadata?.nordinvest_private === true;
}

/** Can this account use the home buyer's map (/boligkoeb)? Private buyers, members given it by an admin, and admins. */
export function hasBuyerAccess(user: AccessUser): boolean {
  return isAdmin(user) || isPrivate(user) || isMemberPrivate(user);
}

/** A member who was also given the broker tools (invited as "begge"). */
export function isMemberBroker(user: AccessUser): boolean {
  return isMember(user) && user?.app_metadata?.nordinvest_broker === true;
}

/** Can this account use the broker tools? Brokers, members invited with both, and admins. */
export function hasBrokerAccess(user: AccessUser): boolean {
  return isAdmin(user) || isBroker(user) || isMemberBroker(user);
}

/** Can this account use the platform (analyser, Deal-motor, ejendomme)? */
export function hasToolAccess(user: AccessUser): boolean {
  return isAdmin(user) || isMember(user);
}

export const UNLIMITED = 999999;

// The monthly analysis limit that actually applies to a user: their plan's
// limit, or unlimited for an admin account.
export function effectiveLimit(
  tier: Tier["id"] | string | null | undefined,
  email?: string | null,
  user?: AccessUser,
): number {
  if (isAdminEmail(email)) return UNLIMITED;
  // Members have an agreed price, not a plan: no monthly cap.
  if (user && hasToolAccess(user)) return UNLIMITED;
  const t = (tier ?? "free") as Tier["id"];
  return limits[t] ?? 3;
}
