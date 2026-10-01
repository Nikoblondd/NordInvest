"use client";

import { useEffect } from "react";
import { captureEvent } from "@/lib/analytics-events";
import { clsx } from "@/lib/clsx";
import { clearCheckoutIntent, readCheckoutIntent, readCheckoutPeriod } from "@/lib/checkout-intent";
import { useCheckout } from "@/lib/use-checkout";

/**
 * Checkout button for a paid tier on /priser. Signed in: straight to the
 * tier's Stripe Payment Link (see lib/use-checkout). Not signed in: signup
 * first; lib/checkout-intent brings them back here with ?koeb=<tier>, and this
 * button then continues to checkout on its own.
 */
export function BuyButton({
  tierId,
  label,
  featured,
  period = "month",
}: {
  tierId: string;
  stripeLink?: string;
  label: string;
  featured?: boolean;
  period?: "month" | "year";
}) {
  const { href, ready, signedIn, onClick } = useCheckout(tierId, period);

  useEffect(() => {
    if (!ready || !signedIn) return;
    const wanted = new URLSearchParams(window.location.search).get("koeb");
    if (wanted === tierId && readCheckoutIntent() === tierId && readCheckoutPeriod() === period) {
      clearCheckoutIntent();
      captureEvent("checkout_resumed", { tier: tierId, period });
      window.location.assign(href);
    }
  }, [ready, signedIn, href, tierId, period]);

  return (
    <a
      href={href}
      aria-disabled={!ready}
      onClick={() => onClick("priser")}
      className={clsx(
        "relative z-10 block w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors",
        featured
          ? "bg-white text-slate-900 shadow-btn hover:bg-slate-100"
          : "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
        !ready && "pointer-events-none opacity-70",
      )}
    >
      {label}
    </a>
  );
}
