import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Phone } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { GuideButton } from "@/components/app/GuideButton";
import { PasswordForm } from "@/components/app/PasswordForm";
import { VagtPanel } from "@/components/dashboard/VagtPanel";
import { SavedSearches, type SavedSearch } from "@/components/dashboard/SavedSearches";
import { DealsOptIn } from "@/components/account/DealsOptIn";
import { ManageSubscriptionButton } from "@/components/dashboard/ManageSubscriptionButton";
import { appUser } from "@/lib/app/data";
import { site } from "@/lib/site";
import type { Watch } from "@/lib/vagt";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Konto" };

export default async function AccountPage({ searchParams }: { searchParams: { skift?: string } }) {
  const me = await appUser();
  if (!me) redirect("/auth/login?next=/app/konto");
  const [{ data: watchRows }, { data: searchRows }] = await Promise.all([
    me.supabase.from("watches").select("*").eq("user_id", me.user.id).order("has_alert", { ascending: false }).order("created_at", { ascending: false }),
    me.supabase.from("saved_searches").select("*").eq("user_id", me.user.id).order("new_count", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  const hasStripe = !!me.profile?.stripe_customer_id;

  return (
    <div className="mx-auto max-w-[920px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader title="Konto" sub={me.user.email ?? undefined} />

      <section className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-[13px] text-slate-500">Navn</p>
            <p className="text-[16px] font-semibold">{me.name || "Ikke angivet"}</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-slate-500">Telefon</p>
            <p className="text-[16px] font-semibold">{(me.profile?.phone as string | null) || "Ikke angivet"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-[13px] text-slate-500">Medlemskab</p>
            <p className="text-[16px] font-semibold">{me.admin ? "Administrator" : "Medlem af NordInvest"}</p>
            <p className="mt-0.5 text-[14px] text-slate-500">Prisen er aftalt personligt. Spørgsmål om din aftale? Ring til Nikolaj.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasStripe && <ManageSubscriptionButton label="Betaling og kvitteringer" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-800 hover:border-slate-400" />}
            <a href={site.phoneHref} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-800 hover:border-slate-400"><Phone size={15} /> {site.phone}</a>
          </div>
        </div>
        <div className="p-5">
          <p className="text-[16px] font-semibold">Adgangskode</p>
          <p className="mb-3 text-[14px] text-slate-500">Bruges, når du logger ind med e-mail.</p>
          <PasswordForm focus={searchParams.skift === "adgangskode"} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-[16px] font-semibold">Guiden</p>
            <p className="text-[14px] text-slate-500">Rundvisningen i NordInvest, trin for trin.</p>
          </div>
          <GuideButton />
        </div>
      </section>

      <VagtPanel initial={(watchRows ?? []) as Watch[]} />
      {/* Older saved searches keep working; new ones are search agents under Find boliger. */}
      {(searchRows ?? []).length > 0 && <SavedSearches initial={(searchRows ?? []) as SavedSearch[]} />}
      <a href="/app/find/agenter" className="mt-6 block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
        <p className="text-[16px] font-semibold text-slate-900">Søgeagenter</p>
        <p className="mt-1 text-[14px] text-slate-500">Dine agenter, deres tidspunkter og mails styrer du under Find boliger → Søgeagenter.</p>
      </a>
      <div className="mt-6"><DealsOptIn /></div>

      <form action="/auth/signout" method="post" className="mt-10 border-t border-slate-200 pt-6">
        <button className="min-h-[44px] text-[15px] font-medium text-rose-600 hover:text-rose-700">Log ud</button>
      </form>
    </div>
  );
}
