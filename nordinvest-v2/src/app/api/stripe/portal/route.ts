import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Creates a Stripe Billing Portal session for the signed-in user so they can
// update, cancel, or view their subscription and invoices.
export async function POST() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "no_subscription" }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://nordinvest.io";

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
