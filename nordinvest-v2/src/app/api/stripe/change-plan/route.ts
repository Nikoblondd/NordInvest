import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tiers, PRODUCT_IDS } from "@/lib/pricing";
import { gateApi } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";

// Upgrade/downgrade the signed-in user's plan.
// - Existing subscriber + a configured Price id → change the plan in place via
//   the API (proration), no second subscription. Returns { ok: true }.
// - Existing subscriber, no Price id yet → open the Stripe portal's plan-update
//   flow. Returns { url }.
// - No active subscription (free) → send them to the tier's Payment Link. { url }.
export async function POST(req: Request) {
  const denied = await gateApi(req);
  if (denied) return denied;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const { tier, period } = (await req.json().catch(() => ({}))) as { tier?: string; period?: string };
  const target = tiers.find((t) => t.id === tier);
  if (!target || target.id === "free") {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", user.id)
    .single();

  const stripe = new Stripe(secretKey);
  const productId = PRODUCT_IDS[target.id];

  // Free / no active subscription → start a fresh subscription via Payment Link.
  // The link carries the user's email and "<userId>__<tier>" so the webhook can
  // attach the payment to this account (same as BuyButton).
  if (!profile?.stripe_subscription_id || !profile.stripe_customer_id) {
    const link = period === "year" && target.annualLink ? target.annualLink : target.stripeLink;
    if (!link) return NextResponse.json({ error: "no_link" }, { status: 400 });
    const u = new URL(link);
    if (user.email) u.searchParams.set("prefilled_email", user.email);
    u.searchParams.set("client_reference_id", `${user.id}__${target.id}`);
    return NextResponse.json({ url: u.toString() });
  }

  // Existing subscriber + a configured Product id → resolve its recurring price
  // and change the plan in place (proration, no second subscription).
  if (productId) {
    try {
      // A product can have a monthly AND a yearly price: keep the subscriber
      // on the interval they already pay (a monthly customer stays monthly).
      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      const itemId = sub.items.data[0]?.id;
      if (!itemId) throw new Error("no subscription item");
      const interval = sub.items.data[0]?.price.recurring?.interval ?? "month";
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        type: "recurring",
        limit: 20,
      });
      const priceId = prices.data.find((p) => p.recurring?.interval === interval)?.id;
      if (priceId) {
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          items: [{ id: itemId, price: priceId }],
          proration_behavior: "always_invoice",
          cancel_at_period_end: false,
        });
        // Optimistic local update; the webhook will confirm.
        await supabase
          .from("profiles")
          .update({ subscription_tier: target.id, subscription_status: "active" })
          .eq("id", user.id);
        return NextResponse.json({ ok: true });
      }
      // productId set but no recurring price found → fall through to portal.
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  // Existing subscriber, no Price id configured yet → Stripe portal update flow.
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${ORIGIN}/dashboard`,
      flow_data: {
        type: "subscription_update",
        subscription_update: { subscription: profile.stripe_subscription_id },
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
