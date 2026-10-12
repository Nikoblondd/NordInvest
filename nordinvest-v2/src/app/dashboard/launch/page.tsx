import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/access";
import { getLaunchReadiness, isLaunchReady, type CheckStatus, type ReadinessCheck } from "@/lib/launch-readiness";
import {
  Lock,
  Boxes,
  Banknote,
  ShieldCheck,
  Database,
  Gauge,
  Route,
  Megaphone,
  Check,
  X,
  Minus,
  Clock3,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";
// PageSpeed Insights runs take 15-30 s each on a cold cache (then cached 6 h).
export const maxDuration = 60;
export const metadata = { title: "Launch readiness", robots: { index: false } };

const ICON = {
  boxes: Boxes,
  banknote: Banknote,
  "shield-check": ShieldCheck,
  database: Database,
  gauge: Gauge,
  route: Route,
  megaphone: Megaphone,
} as const;

const STATUS_TONE: Record<CheckStatus, { badge: string; icon: React.ElementType; label: string; ring: string }> = {
  green:   { badge: "bg-emerald-50 text-emerald-700 ring-emerald-100", icon: Check,  label: "Klar",       ring: "ring-emerald-200/60" },
  amber:   { badge: "bg-amber-50 text-amber-700 ring-amber-100",       icon: Minus,  label: "I gang",     ring: "ring-amber-200/60" },
  waiting: { badge: "bg-slate-100 text-slate-500 ring-slate-200",      icon: Clock3, label: "Afventer",   ring: "ring-slate-200/60" },
  red:     { badge: "bg-rose-50 text-rose-600 ring-rose-100",          icon: X,      label: "Ikke klar",  ring: "ring-rose-200/60" },
};

export default async function LaunchReadinessPage() {
  const supabase = createClient();
  if (!supabase) redirect("/dashboard");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

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
            Denne side er kun for administratorer.
          </p>
          <Link href="/dashboard" className="mt-8 inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Tilbage til dashboard
          </Link>
        </div>
      </div>
    );
  }

  const r = await getLaunchReadiness();
  const ready = isLaunchReady(r);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={13} /> Tilbage til dashboard
        </Link>

        {/* HERO: dark card with grid texture, glowing progress ring */}
        <div
          className="relative mt-4 overflow-hidden rounded-2xl p-6 sm:p-8 md:p-10"
          style={{
            background:
              "linear-gradient(135deg, #0b1220 0%, #0f172a 55%, #111b31 100%)",
            boxShadow:
              "0 20px 50px -20px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse at 30% 20%, black 30%, transparent 75%)",
            }}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full opacity-30 blur-3xl ${
              r.overallStatus === "green"
                ? "bg-emerald-500"
                : r.overallStatus === "amber"
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
          />

          <div className="relative flex flex-col-reverse gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300 backdrop-blur">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]" />
                NordInvest 1.0
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-white md:text-[2.5rem]">
                Launch readiness
              </h1>
              <p className="mt-2 text-slate-400 md:text-lg">
                Målsætningen: alle tunge kategorier grønne, ingen kritiske blokeringer, mindst 85 % samlet.
                Så snart cockpittet er grønt — går vi live.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-inset ring-white/10">
                {ready ? (
                  <>
                    <Sparkles size={13} className="text-emerald-300" /> Klar til launch — sæt datoen.
                  </>
                ) : (
                  <>
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {r.criticalBlockers.length > 0
                      ? `${r.criticalBlockers.length} kritiske blokeringer tilbage`
                      : `Mangler ${100 - r.overallPct} % · fortsæt sporet`}
                  </>
                )}
              </div>
            </div>

            {/* Big progress ring — SVG, real datavisualisation */}
            <ProgressRing pct={r.overallPct} status={r.overallStatus} green={r.greenCount} total={r.totalCount} />
          </div>
        </div>

        {/* Category grid */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {r.categories.map((cat) => {
            const Icon = ICON[cat.icon as keyof typeof ICON] ?? Boxes;
            const g = cat.checks.filter((c) => c.status === "green").length;
            const catPct = Math.round((g / cat.checks.length) * 100);
            return (
              <section
                key={cat.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200"
                    >
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 sm:text-lg">
                        {cat.title}
                      </h2>
                      <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {g}/{cat.checks.length} klar
                        {cat.weight === 3 && (
                          <span className="ml-2 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
                            Tung
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-lg font-semibold tabular-nums text-slate-900 tnum">
                    {catPct}%
                  </span>
                </div>

                {/* progress bar */}
                <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      catPct === 100 ? "bg-emerald-500" : catPct >= 60 ? "bg-blue-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${catPct}%` }}
                  />
                </div>

                <ul className="mt-4 divide-y divide-slate-100">
                  {cat.checks.map((c) => (
                    <CheckRow key={c.id} c={c} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Cockpittet regner sig selv ud fra rigtige data — betalende brugere, aktive annoncer,
          tidsbesparelses-svar, benchmark-katalog. Manuelt satte gates opdateres i{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">src/lib/launch-readiness.ts</code>.
        </p>
      </main>
    </div>
  );
}

function ProgressRing({ pct, status, green, total }: { pct: number; status: CheckStatus; green: number; total: number }) {
  const R = 62;
  const C = 2 * Math.PI * R;
  const stroke =
    status === "green"
      ? "stroke-emerald-400"
      : status === "amber"
      ? "stroke-amber-400"
      : "stroke-rose-400";
  return (
    <div className="relative shrink-0 self-center">
      <svg width={160} height={160} viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={R} className="fill-none stroke-white/10" strokeWidth="8" />
        <circle
          cx="80"
          cy="80"
          r={R}
          className={`fill-none transition-all duration-700 ${stroke}`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <div className="text-4xl font-semibold tabular-nums tracking-[-0.02em] tnum">
          {pct}
          <span className="text-lg font-medium text-slate-400">%</span>
        </div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
          {green} / {total} klar
        </div>
      </div>
    </div>
  );
}

function CheckRow({ c }: { c: ReadinessCheck }) {
  const tone = STATUS_TONE[c.status];
  const StatusIcon = tone.icon;
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${tone.badge}`}
      >
        <StatusIcon size={11} strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-[13px] font-semibold text-slate-900">{c.label}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${tone.badge.split(" ")[1]}`}>
            {tone.label}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{c.detail}</p>
        {c.target && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
            <span aria-hidden className="opacity-40">›</span> mål: {c.target}
          </div>
        )}
      </div>
    </li>
  );
}
