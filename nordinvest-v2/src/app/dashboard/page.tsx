import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, TrendingUp } from "lucide-react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { PortfolioCard } from "@/components/dashboard/PortfolioCard";
import { limits } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  if (!supabase) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h1 className="text-2xl font-bold">Login er ikke aktiveret endnu</h1>
        </div>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, email, subscription_tier")
    .eq("id", user.id)
    .single();
  if (!profile?.phone) redirect("/velkommen");

  const { data: analyses } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", user.id)
    .eq("saved_to_portfolio", true)
    .order("created_at", { ascending: false });

  const list = analyses ?? [];
  const tier = (profile.subscription_tier ?? "free") as keyof typeof limits;
  const max = limits[tier] ?? 3;
  const used = list.length;
  const avgScore = used ? Math.round(list.reduce((s, a) => s + (a.investment_score ?? 0), 0) / used) : 0;
  const firstName = profile.full_name?.split(" ")[0] ?? "investor";
  const tierLabel = tier === "free" ? "Gratis" : tier[0].toUpperCase() + tier.slice(1);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* header */}
        <div className="grain overflow-hidden rounded-3xl bg-slate-900 p-8 text-white md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">Dashboard</div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Velkommen, {firstName}.</h1>
              <p className="mt-2 text-slate-300">Din portefølje af analyserede ejendomme, samlet ét sted.</p>
            </div>
            <Link href="/analyseren" className="inline-flex items-center gap-2 self-start rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-colors hover:bg-blue-500">
              <Plus size={18} /> Ny analyse
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Gemte boliger</div>
            <div className="mt-1 text-3xl font-bold tnum">{used}<span className="text-lg text-slate-300"> / {max === 999999 ? "∞" : max}</span></div>
            {max !== 999999 && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Plan</div>
            <div className="mt-1 text-3xl font-bold">{tierLabel}</div>
            {tier === "free" && <Link href="/priser" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">Opgradér →</Link>}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Gns. score</div>
            <div className="mt-1 flex items-center gap-2 text-3xl font-bold tnum">
              {used ? avgScore : "–"}{used ? <TrendingUp size={20} className="text-emerald-500" /> : null}
            </div>
          </div>
        </div>

        {/* portfolio */}
        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-xl font-bold">Din portefølje</h2>
          <form action="/auth/signout" method="post">
            <button className="text-sm font-medium text-slate-500 hover:text-slate-900">Log ud</button>
          </form>
        </div>

        {used === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-600">Ingen gemte boliger endnu.</p>
            <Link href="/analyseren" className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              <Plus size={18} /> Analysér din første ejendom
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((row) => (
              <PortfolioCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
