"use client";

import { useEffect, useState } from "react";
import { hasAuthCookie, loadSupabase } from "@/lib/supabase/lazy";
import { tiers } from "@/lib/pricing";
import { setCheckoutIntent } from "@/lib/checkout-intent";
import { captureEvent } from "@/lib/analytics-events";

/*
 * The link a "buy" button should use. Signed in: the tier's Stripe Payment
 * Link with the user's email and "<userId>__<tier>" for the webhook. Not
 * signed in: signup, with the plan remembered (lib/checkout-intent) so the
 * user continues straight to checkout afterwards.
 */
export function useCheckout(tierId: string) {
  const link = tiers.find((t) => t.id === tierId)?.stripeLink ?? "";
  const [href, setHref] = useState("/auth/signup?next=/priser");
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!hasAuthCookie() || !link) { setReady(true); return; }
    loadSupabase().then((supabase) => {
      if (!supabase) { setReady(true); return; }
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          const u = new URL(link);
          if (user.email) u.searchParams.set("prefilled_email", user.email);
          u.searchParams.set("client_reference_id", `${user.id}__${tierId}`);
          setHref(u.toString());
          setSignedIn(true);
        }
        setReady(true);
      });
    });
  }, [link, tierId]);

  /** Call from the button's onClick; `from` says which prompt sold it. */
  const onClick = (from: string) => {
    captureEvent("checkout_clicked", { tier: tierId, from });
    if (!signedIn) setCheckoutIntent(tierId);
  };

  return { href, ready, signedIn, onClick };
}
