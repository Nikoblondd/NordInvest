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
