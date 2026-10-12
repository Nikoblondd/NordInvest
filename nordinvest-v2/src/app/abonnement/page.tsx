import { redirect } from "next/navigation";
import { CancelFlow } from "@/components/subscription/CancelFlow";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { UpgradeOptions } from "@/components/subscription/UpgradeOptions";
import { ManageSubscriptionButton } from "@/components/dashboard/ManageSubscriptionButton";
import { limits } from "@/lib/pricing";
import { effectiveLimit, hasToolAccess } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AbonnementPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const tier = (profile?.subscription_tier ?? "free") as keyof typeof limits;
  const tierLabel = tier === "free" ? "Gratis" : tier[0].toUpperCase() + tier.slice(1);
  const max = effectiveLimit(profile?.subscription_tier, user.email);
  const hasSub = !!profile?.stripe_customer_id && tier !== "free";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link href="/konto" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} /> Tilbage til konto
        </Link>

        <div className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Dit abonnement</h1>
          <p className="mt-2 text-slate-600">
            Du er på <b>{tierLabel}-planen</b>
            {max >= 999999 ? " med ubegrænsede analyser." : ` med ${max} analyser om måneden.`}{" "}
            {hasToolAccess(user) && max < 999999 && "Få mere ud af NordInvest med en større plan."}
          </p>
        </div>

        {/* No self-serve upgrades on the closed platform; price is agreed after a conversation. */}
        {hasToolAccess(user) && (
          <div className="mt-8">
            <UpgradeOptions currentTier={tier} />
          </div>
        )}

        {/* Small, understated cancel/manage link at the very bottom */}
        {hasSub && (
          <div className="mt-12 border-t border-slate-200 pt-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <ManageSubscriptionButton
                label="Opdater betalingskort"
                showIcon={false}
                className="text-sm font-medium text-slate-400 underline underline-offset-2 hover:text-slate-600"
              />
              <CancelFlow tier={tier} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
