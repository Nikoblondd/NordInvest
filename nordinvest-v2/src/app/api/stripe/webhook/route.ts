import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { tiers } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Map a Stripe amount (in øre) to a tier id, using the prices in pricing.ts.
const AMOUNT_TO_TIER: Record<number, string> = Object.fromEntries(
  tiers.filter((t) => t.price > 0).map((t) => [t.price * 100, t.id]),
);

const VALID_TIERS = new Set<string>(tiers.map((t) => t.id));

function tierFromAmounts(...amounts: (number | null | undefined)[]): string | null {
  for (const a of amounts) if (a && AMOUNT_TO_TIER[a]) return AMOUNT_TO_TIER[a];
  return null;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(secretKey);
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, {
      status: 400,
    });
  }

  const supabase = admin();
  if (!supabase) return new Response("Supabase not configured", { status: 500 });

  try {
    switch (event.type) {
      // A new subscription was paid for → upgrade the user.
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // client_reference_id is "<userId>__<tier>" (see BuyButton). The tier
        // hint is authoritative; fall back to amount only if it's missing.
        const [userId, tierHint] = (s.client_reference_id ?? "").split("__");
        const tier = VALID_TIERS.has(tierHint)
          ? tierHint
          : tierFromAmounts(s.amount_subtotal, s.amount_total) ?? "starter";
        if (userId) {
          await supabase
            .from("profiles")
            .update({
              subscription_tier: tier,
              subscription_status: "active",
              stripe_customer_id: typeof s.customer === "string" ? s.customer : null,
              stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : null,
            })
            .eq("id", userId);
        }
        break;
      }

      // Plan changed / cancellation scheduled via the portal → sync status.
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const amount = sub.items.data[0]?.price.unit_amount ?? null;
        const tier = tierFromAmounts(amount);
        const active = sub.status === "active" || sub.status === "trialing";
        const canceling = sub.cancel_at_period_end === true;
        if (typeof sub.customer === "string") {
          const patch: Record<string, string> = {
            subscription_status: canceling ? "canceling" : sub.status,
            stripe_subscription_id: sub.id,
          };
          // Only touch the tier when we're confident: drop to free if the sub is
          // no longer active, or set the mapped tier on an active plan change.
          // (Leave it untouched if the amount doesn't map, to avoid a wrong downgrade.)
          if (!active) patch.subscription_tier = "free";
          else if (tier) patch.subscription_tier = tier;
          await supabase.from("profiles").update(patch).eq("stripe_customer_id", sub.customer);
        }
        break;
      }

      // Subscription ended/cancelled → drop back to free.
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (typeof sub.customer === "string") {
          await supabase
            .from("profiles")
            .update({ subscription_tier: "free", subscription_status: "canceled" })
            .eq("stripe_customer_id", sub.customer);
        }
        break;
      }
    }
  } catch (err) {
    // Return 500 so Stripe retries; never leak internals.
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
