import { redirect } from "next/navigation";
import { DealsOptIn } from "@/components/account/DealsOptIn";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, ArrowUpRight, Gauge, Rocket, Search, ClipboardCheck, FileSearch, KanbanSquare } from "lucide-react";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { Crm, type CrmRow } from "@/components/dashboard/Crm";
import { WelcomeCelebration } from "@/components/dashboard/WelcomeCelebration";
import { VagtPanel } from "@/components/dashboard/VagtPanel";
import { SavedSearches, type SavedSearch } from "@/components/dashboard/SavedSearches";
import { limits } from "@/lib/pricing";
import { effectiveLimit, isAdminEmail } from "@/lib/access";
import { BarChart3 } from "lucide-react";
import type { Watch } from "@/lib/vagt";

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
    .select("full_name, phone, email, subscription_tier, subscription_status, stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile?.phone) redirect("/velkommen");

  const { data: analyses } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", user.id)
    .eq("saved_to_portfolio", true)
    .order("created_at", { ascending: false });

  // Monthly quota = analyses saved since the 1st of this month.
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const { count: usedThisMonth } = await supabase
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  const { data: watchRows } = await supabase
    .from("watches")
    .select("*")
    .eq("user_id", user.id)
    .order("has_alert", { ascending: false })
    .order("created_at", { ascending: false });
  const watches = (watchRows ?? []) as Watch[];

  const { data: searchRows } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("new_count", { ascending: false })
    .order("created_at", { ascending: false });
  const savedSearches = (searchRows ?? []) as SavedSearch[];

  const list = analyses ?? [];
  const tier = (profile.subscription_tier ?? "free") as keyof typeof limits;
  const max = effectiveLimit(profile.subscription_tier, user.email);
  const usedMonth = usedThisMonth ?? 0;
  const isUnlimited = max >= 999999;
  const firstName = profile.full_name?.split(" ")[0] ?? "investor";
  const tierLabel = tier === "free" ? "Gratis" : tier[0].toUpperCase() + tier.slice(1);
  const hasSub = !!profile.stripe_customer_id && tier !== "free";
  const statusLabel =
    profile.subscription_status === "canceling" ? "Opsagt — aktiv til periodeslut"
    : profile.subscription_status === "active" ? "Aktivt"
    : profile.subscription_status === "canceled" ? "Opsagt"
    : profile.subscription_status === "past_due" ? "Betaling mangler"
    : hasSub ? "Aktivt" : "Gratis plan";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Suspense fallback={null}>
        <WelcomeCelebration firstName={firstName} />
      </Suspense>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* HERO — dark navy header with real depth: layered gradient background,
            faint grid texture, an accent glow. NOT a flat dark rectangle. */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 sm:p-8 md:p-10"
          style={{
            background:
              "linear-gradient(135deg, #0b1220 0%, #0f172a 55%, #111b31 100%)",
            boxShadow:
              "0 20px 50px -20px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Grid texture — real design detail from Linear/Vercel */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse at 30% 20%, black 30%, transparent 75%)",
            }}
          />
          {/* Colored glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
          />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-blue-300 backdrop-blur">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]" />
                Mine ejendomme
              </div>
              <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-white [text-wrap:balance] md:text-[2.5rem]">
                Godmorgen, {firstName}.
              </h1>
              <p className="mt-2 text-slate-400 md:text-lg">
                Alle boliger, du arbejder på: fremvisninger, papirer, bank og bud ét sted.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start">
              {isAdminEmail(user.email) && (
                <>
                  <Link
                    href="/dashboard/launch"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 backdrop-blur"
                  >
                    <Rocket size={15} /> Launch
                  </Link>
                  <Link
                    href="/dashboard/analytics"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 backdrop-blur"
                  >
                    <BarChart3 size={15} /> Analytics
                  </Link>
                </>
              )}
              <Link
                href="/deals"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 backdrop-blur"
              >
                <Search size={15} /> Find boliger
              </Link>
              <Link
                href="/analyseren/start"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-btn transition-colors hover:bg-slate-100"
              >
                <Plus size={15} /> Tilføj bolig
              </Link>
            </div>
          </div>
        </div>

        {/* The CRM: pipeline figures, next tasks and the board. */}
        <div className="mt-5">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Din første bolig</h2>
              <p className="mt-1.5 max-w-xl text-[16px] text-slate-600">Her samler du alle boliger, du overvejer at købe, og følger hver af dem fra første kig til nøgleoverdragelse.</p>
              <ol className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { Icon: Plus, t: "Analysér en bolig", d: "Indsæt et link, og tryk \"Gem og opret ejendomsmappe\"." },
                  { Icon: KanbanSquare, t: "Følg den i pipelinen", d: "Fra screening over fremvisning og bank til bud." },
                  { Icon: FileSearch, t: "Lad AI'en læse papirerne", d: "Salgsopstilling, referater og tilstandsrapport med risici og sidetal." },
                ].map(({ Icon, t, d }, i) => (
                  <li key={t} className="rounded-xl bg-slate-50 p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-slate-200"><Icon size={18} strokeWidth={1.8} /></span>
                    <p className="mt-3 text-[15px] font-semibold text-slate-900">{i + 1}. {t}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{d}</p>
                  </li>
                ))}
              </ol>
              <Link href="/analyseren/start" className="mt-6 inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-[16px] font-semibold text-white shadow-btn hover:bg-blue-500">
                <Plus size={17} /> Tilføj din første bolig
              </Link>
            </div>
          ) : (
            <Crm initial={list as CrmRow[]} />
          )}
        </div>

        {/* Account: plan, usage, alerts and searches. */}
        <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-8">
          <h2 className="flex items-center gap-2 text-xl font-bold"><ClipboardCheck size={20} strokeWidth={1.8} className="text-slate-500" /> Konto, vagter og søgninger</h2>
          <form action="/auth/signout" method="post">
            <button className="-my-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-900">Log ud</button>
          </form>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Kpi
            accent="blue"
            icon={<Gauge size={16} strokeWidth={1.8} />}
            label="Analyser i denne måned"
            value={
              <>
                {usedMonth}
                <span className="ml-1 text-lg font-medium text-slate-300"> / {isUnlimited ? "∞" : max}</span>
              </>
            }
            progress={!isUnlimited ? Math.min(100, (usedMonth / max) * 100) : undefined}
          />
          <div
            className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"
            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)" }}
          >
            <div className="text-[13px] font-medium text-slate-500">Plan</div>
            <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-2xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-[1.75rem]">{tierLabel}</span>
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${profile.subscription_status === "past_due" ? "bg-rose-50 text-rose-600" : profile.subscription_status === "canceled" || profile.subscription_status === "canceling" ? "bg-amber-50 text-amber-700" : hasSub ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{statusLabel}</span>
            </div>
            <Link href="/abonnement" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-blue-700">
              {hasSub ? "Administrer" : "Opgradér plan"} <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Vagt — monitored listings */}
        <VagtPanel initial={watches} />

        {/* Saved searches — "Vagt på søgning" */}
        <SavedSearches initial={savedSearches} />

        <div className="mt-6">
          <DealsOptIn />
        </div>
      </main>
    </div>
  );
}

// KPI tile: real product-designer polish. Colored icon badge on top, big
// tabular number, optional progress bar or hint. Each metric has its own
// accent tone so the row reads as three distinct cards, not the same
// three cards printed three times.
type KpiAccent = "blue" | "indigo" | "emerald";
const KPI_ACCENT: Record<KpiAccent, { badge: string; icon: string; ring: string; bar: string }> = {
  blue:    { badge: "bg-blue-50",    icon: "text-blue-600",    ring: "ring-blue-100",    bar: "bg-blue-600" },
  indigo:  { badge: "bg-indigo-50",  icon: "text-indigo-600",  ring: "ring-indigo-100",  bar: "bg-indigo-600" },
  emerald: { badge: "bg-emerald-50", icon: "text-emerald-600", ring: "ring-emerald-100", bar: "bg-emerald-600" },
};

function Kpi({
  accent,
  icon,
  label,
  value,
  progress,
  hint,
}: {
  accent: KpiAccent;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  progress?: number;
  hint?: string;
}) {
  const a = KPI_ACCENT[accent];
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 transition-all duration-300 sm:p-5 hover:-translate-y-[1px] hover:shadow-card-lift"
      style={{
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <div className="flex items-start gap-2 text-[13px] font-medium leading-snug text-slate-500">
        <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${a.badge} ${a.icon} ${a.ring}`}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2.5 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-slate-900 tnum sm:text-[1.75rem]">
        {value}
      </div>
      {progress != null && (
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${a.bar}`} style={{ width: `${progress}%` }} />
        </div>
      )}
      {hint && <div className="mt-1.5 text-[13px] text-slate-500">{hint}</div>}
    </div>
  );
}
