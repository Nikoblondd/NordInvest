/*
 * A visitor who clicks "Køb <plan>" before having an account goes through
 * signup first. This cookie remembers the plan across the OAuth / magic-link
 * round trip, so they land back on /priser and continue straight to checkout
 * instead of on the welcome page.
 */
export const CHECKOUT_COOKIE = "ni_buy";
const TIER = /^[a-z]{2,20}$/;

export const validTier = (t: string | null | undefined): t is string => !!t && TIER.test(t);

/** Where to send a freshly signed-in user who has a pending checkout, else null. */
export const checkoutDest = (tier: string | null | undefined) => (validTier(tier) ? `/priser?koeb=${tier}` : null);

export function setCheckoutIntent(tier: string) {
  if (validTier(tier)) document.cookie = `${CHECKOUT_COOKIE}=${tier}; Max-Age=3600; Path=/; SameSite=Lax`;
}

export function readCheckoutIntent(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CHECKOUT_COOKIE}=([^;]*)`));
  return m && validTier(m[1]) ? m[1] : null;
}

export function clearCheckoutIntent() {
  document.cookie = `${CHECKOUT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/*
 * Where to return after signup when the visitor was stopped mid-task (the
 * signup gate on an analysis): back to that exact analysis, not the welcome
 * page. Same-origin paths only.
 */
export const RETURN_COOKIE = "ni_return";

export const safeReturn = (p: string | null | undefined): string | null => {
  if (!p) return null;
  let v = p;
  try { v = decodeURIComponent(p); } catch { return null; }
  return v.startsWith("/") && !v.startsWith("//") && v.length < 1800 ? v : null;
};

export function setReturnPath(path: string) {
  if (safeReturn(path)) document.cookie = `${RETURN_COOKIE}=${encodeURIComponent(path)}; Max-Age=3600; Path=/; SameSite=Lax`;
}

export function readReturnPath(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${RETURN_COOKIE}=([^;]*)`));
  return m ? safeReturn(m[1]) : null;
}

export function clearReturnPath() {
  document.cookie = `${RETURN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** Client: where a user who just signed in should go (pending checkout, then pending task). */
export function pendingDest(): string | null {
  const buy = checkoutDest(readCheckoutIntent());
  if (buy) return buy;
  const back = readReturnPath();
  if (back) clearReturnPath();
  return back;
}
