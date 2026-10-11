import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BarChart3, Rocket } from "lucide-react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { DealsOptIn } from "@/components/account/DealsOptIn";
import { VagtPanel } from "@/components/dashboard/VagtPanel";
import { SavedSearches, type SavedSearch } from "@/components/dashboard/SavedSearches";
import { limits } from "@/lib/pricing";
import { effectiveLimit, isAdminEmail } from "@/lib/access";
import type { Watch } from "@/lib/vagt";

export const dynamic = "force-dynamic";
export const metadata = { title: "Konto", robots: { index: false } };

/** Account: plan, usage this month, listing alerts, saved searches and e-mail settings. */
export default async function KontoPage() {
  const supabase = createClient();
  if (!supabase) redirect("/auth/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/konto");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, subscription_tier, subscription_status, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const [{ count: usedThisMonth }, { data: watchRows }, { data: searchRows }] = await Promise.all([
    supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfMonth.toISOString()),
    supabase.from("watches").select("*").eq("user_id", user.id).order("has_alert", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("saved_searches").select("*").eq("user_id", user.id).order("new_count", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  const tier = (profile?.subscription_tier ?? "free") as keyof typeof limits;
  const tierLabel = tier === "free" ? "Gratis" : tier[0].toUpperCase() + tier.slice(1);
  const max = effectiveLimit(profile?.subscription_tier, user.email);
  const used = usedThisMonth ?? 0;
  const unlimited = max >= 999999;
  const hasSub = !!profile?.stripe_customer_id && tier !== "free";
  const status = profile?.subscription_status;
  const statusLabel =
    status === "canceling" ? "Opsagt, aktiv til periodens slut"
    : status === "past_due" ? "Betaling mangler"
    : status === "canceled" ? "Opsagt"
    : hasSub ? "Aktivt" : "Gratis plan";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Link href="/dashboard" className="inline-flex min-h-[40px] items-center gap-1.5 text-[15px] font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} /> Mine ejendomme
        </Link>
        <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">Konto</h1>
        <p className="mt-1 text-[15px] text-slate-500">{profile?.full_name ?? user.email}</p>

        <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
            <div>
              <p className="text-[14px] text-slate-500">Plan</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[20px] font-semibold">
                {tierLabel}
                <span className={`rounded px-1.5 py-0.5 text-[12px] font-semibold ${status === "past_due" ? "bg-rose-50 text-rose-700" : status === "canceled" || status === "canceling" ? "bg-amber-50 text-amber-800" : hasSub ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{statusLabel}</span>
              </p>
            </div>
            <Link href="/abonnement" className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-slate-200 px-4 text-[15px] font-semibold hover:border-slate-300">
              {hasSub ? "Administrér" : "Opgradér"} <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[14px] text-slate-500">Analyser i denne måned</p>
              <p className="text-[18px] font-semibold tabular-nums">{used}<span className="text-slate-400"> / {unlimited ? "ubegrænset" : max}</span></p>
            </div>
            {!unlimited && (
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
              </div>
            )}
          </div>
        </div>

        <VagtPanel initial={(watchRows ?? []) as Watch[]} />
        <SavedSearches initial={(searchRows ?? []) as SavedSearch[]} />
        <div className="mt-6"><DealsOptIn /></div>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6">
          {isAdminEmail(user.email) && (
            <>
              <Link href="/dashboard/launch" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[14px] font-medium"><Rocket size={15} /> Launch</Link>
              <Link href="/dashboard/analytics" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[14px] font-medium"><BarChart3 size={15} /> Analytics</Link>
            </>
          )}
          <form action="/auth/signout" method="post" className="ml-auto">
            <button className="min-h-[40px] px-2 text-[14px] font-medium text-rose-600 hover:text-rose-700">Log ud</button>
          </form>
        </div>
      </main>
    </div>
  );
}
