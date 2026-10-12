import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/access";
import { getAnalytics } from "@/lib/analytics-data";
import { getPosthogAnalytics } from "@/lib/posthog-data";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";
import { Users, UserPlus, CreditCard, TrendingUp, Activity, Bell, Lock, Download } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics", robots: { index: false } };

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
const pctOf = (n: number, d: number | null | undefined): number | null =>
  d && d > 0 ? Math.round((n / d) * 1000) / 10 : null;

export default async function AnalyticsPage() {
  const supabase = createClient();
  if (!supabase) redirect("/dashboard");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Only admins (ADMIN_EMAILS — server-only, cannot be self-granted) may view
  // this. Everyone else gets an explicit "no access" message, not a silent bounce.
  if (!isAdmin(user)) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="mx-auto max-w-lg px-6 py-28 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <Lock size={30} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Du har ikke adgang</h1>
          <p className="mt-3 text-slate-500">
            Denne side er kun for administratorer. Har du brug for adgang, så kontakt ejeren af NordInvest.
          </p>
          <Link href="/dashboard" className="mt-8 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Tilbage til dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [a, ph] = await Promise.all([getAnalytics(), getPosthogAnalytics()]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">Dine tal, opdateret automatisk. Kun synlig for admin.</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/admin/export?period=month" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Download size={14} /> Måned (CSV)
            </a>
            <a href="/api/admin/export?period=year" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Download size={14} /> År (CSV)
            </a>
            <Link href="/dashboard" className="ml-1 text-sm font-semibold text-blue-600 hover:text-blue-700">← Dashboard</Link>
          </div>
        </div>

        {!a.configured && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
            Databasen er ikke forbundet (mangler Supabase-nøgler i miljøet).
          </div>
        )}

        {/* headline KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={<Users size={18} />} label="Brugere i alt" value={a.totalUsers.toLocaleString("da-DK")} sub={`+${a.newUsers7} de sidste 7 dage`} />
          <Kpi icon={<UserPlus size={18} />} label="Nye brugere (30 dage)" value={a.newUsers30.toLocaleString("da-DK")} sub={`${a.newUsers7} i denne uge`} />
          <Kpi icon={<CreditCard size={18} />} label="Betalende brugere" value={a.payingUsers.toLocaleString("da-DK")} sub={`${a.conversionPct}% konvertering`} tone="emerald" />
          <Kpi icon={<TrendingUp size={18} />} label="MRR (månedlig omsætning)" value={kr(a.mrr)} sub={`${kr(a.arr)} på årsbasis`} tone="emerald" />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={<Activity size={18} />} label="Analyser kørt (i alt)" value={a.totalAnalyses.toLocaleString("da-DK")} sub={`${a.analyses7} de sidste 7 dage`} />
          <Kpi icon={<Activity size={18} />} label="Aktive brugere (30 dage)" value={a.activeUsers30.toLocaleString("da-DK")} sub={`${a.activeUsers7} denne uge`} />
          <Kpi icon={<Bell size={18} />} label="Vagter" value={a.watches.toLocaleString("da-DK")} sub="ejendomme overvåget" />
          <Kpi icon={<Bell size={18} />} label="Gemte søgninger" value={a.savedSearches.toLocaleString("da-DK")} sub="aktive søgeagenter" />
        </div>

        {/* charts */}
        <div className="mt-8">
          <AnalyticsCharts series={a.series} />
        </div>

        {/* Validering — betalingstesten */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Validering — betalingstesten</h2>
          <p className="text-xs text-slate-400">Tragten og den dokumenterede tidsbesparelse, der afgør, om modellen holder kommercielt.</p>

          {/* the funnel */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FunnelStep label="Besøgende (30 dage)" value={ph.configured ? ph.visitors30 : null} />
            <FunnelStep label="Analyser kørt (30 dage)" value={a.analyses30} rate={ph.configured ? pctOf(a.analyses30, ph.visitors30) : null} rateLabel="af besøgende" />
            <FunnelStep label="Nye brugere (30 dage)" value={a.newUsers30} rate={ph.configured ? pctOf(a.newUsers30, ph.visitors30) : null} rateLabel="af besøgende" />
            <FunnelStep label="Betalende (i alt)" value={a.payingUsers} rate={pctOf(a.payingUsers, a.totalUsers)} rateLabel="af brugere" tone="emerald" />
          </div>

          {/* behavioural micro-funnel from PostHog: start → complete → paywall → checkout */}
          {ph.configured && (() => {
            const ev = (name: string) => ph.events30.find((e) => e.label === name)?.count ?? 0;
            const started = ev("analyze_started");
            const completed = ev("analysis_completed");
            const paywall = ev("paywall_shown");
            const checkout = ev("checkout_clicked");
            return (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FunnelStep label="Analyse startet (30 dage)" value={started} />
                <FunnelStep label="Analyse gennemført" value={completed} rate={pctOf(completed, started)} rateLabel="af startede" />
                <FunnelStep label="Paywall vist" value={paywall} rate={pctOf(paywall, completed)} rateLabel="af gennemførte" />
                <FunnelStep label="Checkout klikket" value={checkout} rate={pctOf(checkout, paywall)} rateLabel="af paywall" tone="emerald" />
              </div>
            );
          })()}

          {/* time savings — the decisive evidence */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-blue-600">Median tid sparet pr. analyse</div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {a.timeSavings.medianManualMinutes != null ? `${a.timeSavings.medianManualMinutes} min` : "—"}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {a.timeSavings.responses > 0
                  ? `Brugernes estimat af manuelt tidsforbrug · ${a.timeSavings.responses} svar`
                  : "Ingen svar endnu — vises når brugere svarer efter en analyse"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Holdt tallene?</div>
              {a.timeSavings.responses > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  <AccRow label="Tallene passede" n={a.timeSavings.matched} total={a.timeSavings.responses} tone="emerald" />
                  <AccRow label="Rettede småting" n={a.timeSavings.minor} total={a.timeSavings.responses} tone="amber" />
                  <AccRow label="Store afvigelser" n={a.timeSavings.major} total={a.timeSavings.responses} tone="rose" />
                </ul>
              ) : (
                <div className="mt-3 text-sm text-slate-400">Ingen svar endnu.</div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Sådan læses tragten</div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Målet for testen: mindst 5 betalende og en median tidsbesparelse, der mindst halverer det manuelle arbejde.
                Følg konverteringen fra besøgende til betalende, og hold øje med om tallene holder.
              </p>
            </div>
          </div>
        </div>

        {/* revenue by tier */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Omsætning pr. plan</div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 font-semibold">Plan</th>
                  <th className="py-2 text-right font-semibold">Betalende</th>
                  <th className="py-2 text-right font-semibold">Pris/md</th>
                  <th className="py-2 text-right font-semibold">MRR</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {a.tierBreakdown.map((t) => (
                  <tr key={t.tier} className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-700">{t.name}</td>
                    <td className="py-2 text-right text-slate-600">{t.count}</td>
                    <td className="py-2 text-right text-slate-600">{kr(t.price)}</td>
                    <td className="py-2 text-right font-semibold text-slate-900">{kr(t.mrr)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 font-bold text-slate-900">I alt</td>
                  <td className="py-2 text-right font-bold text-slate-900">{a.payingUsers}</td>
                  <td className="py-2" />
                  <td className="py-2 text-right font-bold text-emerald-600">{kr(a.mrr)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Brugere */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">Brugere ({a.users.length})</div>
            <div className="text-xs text-slate-400">Alle, der har oprettet en konto</div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 font-semibold">Navn</th>
                  <th className="py-2 font-semibold">E-mail</th>
                  <th className="py-2 font-semibold">Telefon</th>
                  <th className="py-2 font-semibold">Plan</th>
                  <th className="py-2 text-right font-semibold">Analyser</th>
                  <th className="py-2 text-right font-semibold">Oprettet</th>
                </tr>
              </thead>
              <tbody>
                {a.users.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400">Ingen brugere endnu.</td></tr>
                )}
                {a.users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-800">{u.name}</td>
                    <td className="py-2 text-slate-600">{u.email}</td>
                    <td className="py-2 text-slate-500">{u.phone ?? "—"}</td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.tier === "free" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>
                        {u.tier === "free" ? "Gratis" : u.tier}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-600">{u.analyses}</td>
                    <td className="py-2 text-right tabular-nums text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trafik, kilder & adfærd (PostHog) */}
        {ph.configured ? (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Trafik, kilder & adfærd</h2>
                <p className="text-xs text-slate-400">Alle besøgende — også gæster uden konto (fra PostHog).</p>
              </div>
              {ph.projectUrl && (
                <a href={`${ph.projectUrl}/replay`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Se session-optagelser & enkelte rejser →
                </a>
              )}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={<Activity size={18} />} label="Besøgende (30 dage)" value={ph.visitors30.toLocaleString("da-DK")} sub={`${ph.visitors7} de sidste 7 dage`} />
              <Kpi icon={<Activity size={18} />} label="Sidevisninger (30 dage)" value={ph.pageviews30.toLocaleString("da-DK")} sub={`${ph.pageviews7} de sidste 7 dage`} />
              <Kpi icon={<TrendingUp size={18} />} label="Analyser startet (klik)" value={(ph.events30.find((e) => e.label === "analyze_started")?.count ?? 0).toLocaleString("da-DK")} sub="fra “Få analysen”-knappen" />
              <Kpi icon={<CreditCard size={18} />} label="Checkout klikket" value={(ph.events30.find((e) => e.label === "checkout_clicked")?.count ?? 0).toLocaleString("da-DK")} sub="tryk på køb/opgradér" />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <ListCard title="Hvor kommer de fra" subtitle="Kilder (30 dage)" rows={ph.topReferrers} />
              <ListCard title="Mest besøgte sider" subtitle="Sidevisninger (30 dage)" rows={ph.topPages} />
              <ListCard title="Landingssider" subtitle="Første side i besøget" rows={ph.topLanding} />
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/50 p-6">
            <div className="text-sm font-semibold text-slate-900">Vis trafik & adfærd her i boardet</div>
            <p className="mt-2 text-sm text-slate-600">
              Din adfærdsdata (besøgende, hvor de kommer fra, sider, rejser, klik) opsamles allerede i PostHog. For at vise den HER i
              dit eget board mangler jeg kun en <span className="font-semibold">læse-nøgle</span> (Personal API Key). Sådan gør du:
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>I PostHog: <span className="font-mono">Settings → Personal API Keys → New personal API key</span>.</li>
              <li>Giv den læse-adgang (scope: “Query Read”) og opret den. Kopiér nøglen (starter med <span className="font-mono">phx_</span> eller <span className="font-mono">phs_</span>).</li>
              <li>Send den til mig — jeg gemmer den <span className="font-semibold">sikkert server-side</span> (aldrig i browseren), og så vises alle tallene her.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-400">
              Indtil da kan du altid se det hele i PostHogs eget dashboard på eu.posthog.com.
            </p>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Alle tal opdateres automatisk. Dine egne data (brugere, betaling, forbrug) kommer fra din database; trafik & adfærd fra
          PostHog. Data om adfærd indsamles kun for besøgende, der har trykket “Accepter” i cookie-banneret.
        </p>
      </div>
    </div>
  );
}

function ListCard({ title, subtitle, rows }: { title: string; subtitle: string; rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="text-xs text-slate-400">{subtitle}</div>
      <ul className="mt-4 space-y-2.5">
        {rows.length === 0 && <li className="text-sm text-slate-400">Ingen data endnu.</li>}
        {rows.map((r, i) => (
          <li key={i}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-slate-700" title={r.label}>{r.label || "/"}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{r.count.toLocaleString("da-DK")}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-500/70" style={{ width: `${Math.round((r.count / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FunnelStep({ label, value, rate, rateLabel, tone }: { label: string; value: number | null; rate?: number | null; rateLabel?: string; tone?: "emerald" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 text-3xl font-bold tabular-nums ${tone === "emerald" ? "text-emerald-600" : "text-slate-900"}`}>
        {value != null ? value.toLocaleString("da-DK") : "—"}
      </div>
      <div className="mt-1 text-xs text-slate-400">
        {rate != null ? `${rate.toLocaleString("da-DK")} % ${rateLabel ?? ""}` : " "}
      </div>
    </div>
  );
}

function AccRow({ label, n, total, tone }: { label: string; n: number; total: number; tone: "emerald" | "amber" | "rose" }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  const bar = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-rose-400";
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-slate-600">{label}</span>
        <span className="shrink-0 font-semibold tabular-nums text-slate-900">{n} · {pct} %</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "emerald" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wide ${tone === "emerald" ? "text-emerald-600" : "text-slate-400"}`}>
        {icon} {label}
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
