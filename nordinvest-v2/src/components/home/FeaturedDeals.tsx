import Link from "next/link";
import { ArrowRight, Building2, Home as HomeIcon, TrendingUp } from "lucide-react";
import {
  FEATURED_COMMERCIAL,
  FEATURED_MONTH_LABEL,
  FEATURED_RESIDENTIAL,
  type FeaturedDeal,
} from "@/lib/featured-deals";

const kr = (n: number) =>
  new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(n);

const krCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)} mio`;
  return `${Math.round(n / 1000)}k`;
};

function DealCard({ deal }: { deal: FeaturedDeal }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={deal.image}
          alt={`${deal.address}, ${deal.zip} ${deal.city}`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200">
          <span className="text-emerald-600">●</span>
          Score {deal.score}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-white">
          {deal.yieldPct.toFixed(1)} % afkast
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {deal.typeLabel} · {deal.zip} {deal.city}
          </div>
          <h3 className="mt-1 truncate text-base font-semibold text-slate-900">
            {deal.address}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-100">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Pris</div>
            <div className="text-sm font-semibold text-slate-900">
              {krCompact(deal.price)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Areal</div>
            <div className="text-sm font-semibold text-slate-900">{deal.area} m²</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">
              {deal.cashFlowMonth != null ? "Cashflow" : "Afkast"}
            </div>
            <div className="text-sm font-semibold text-emerald-700">
              {deal.cashFlowMonth != null
                ? `+${kr(deal.cashFlowMonth)}/md`
                : `${deal.yieldPct.toFixed(1)} %`}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600">{deal.highlight}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-sm">
          <Link
            href={deal.analyzeUrl}
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
          >
            Analyser <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <a
            href={deal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Se opslag ↗
          </a>
        </div>
      </div>
    </article>
  );
}

/**
 * Landing-page "Deal-motoren" showcase. Sits right below the analyze-your-own
 * input, positions the deal-motor as the second core surface, and features the
 * current month's top-3 residential and top-3 commercial deals pulled from
 * `lib/featured-deals.ts` (refreshed monthly, sourced from the live engine).
 */
export function FeaturedDeals() {
  return (
    <section id="maanedens-deals" className="bg-slate-50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <TrendingUp className="h-3 w-3 text-blue-500" />
            Deal-motoren · {FEATURED_MONTH_LABEL}
          </div>
          <h2 className="max-w-3xl text-3xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">
            Vi finder de bedste deals — så du ikke skal
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-slate-500">
            Deal-motoren scanner hele det danske marked hver dag, kører fuld analyse
            på hver enkelt, og rangerer på cashflow, afkast og risiko. Her er top 3
            for {FEATURED_MONTH_LABEL.toLowerCase()}.
          </p>
        </div>

        {/* Residential top 3 */}
        <div className="mb-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div className="flex items-center gap-2">
              <HomeIcon className="h-5 w-5 text-slate-700" />
              <h3 className="text-lg font-semibold text-slate-900">
                Månedens boliginvesteringer
              </h3>
            </div>
            <Link
              href="/deals?market=bolig&all=1&sort=score"
              className="hidden text-sm font-semibold text-blue-600 hover:text-blue-700 sm:inline-flex"
            >
              Se alle boligdeals →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_RESIDENTIAL.map((d) => (
              <DealCard key={d.sourceUrl} deal={d} />
            ))}
          </div>
        </div>

        {/* Commercial top 3 */}
        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-700" />
              <h3 className="text-lg font-semibold text-slate-900">
                Månedens erhvervsinvesteringer
              </h3>
            </div>
            <Link
              href="/deals?market=investering&all=1&sort=score"
              className="hidden text-sm font-semibold text-blue-600 hover:text-blue-700 sm:inline-flex"
            >
              Se alle erhvervsdeals →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_COMMERCIAL.map((d) => (
              <DealCard key={d.sourceUrl} deal={d} />
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Åbn Deal-motoren
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-slate-500">
            Filtrér på by, prisspænd, afkast, cashflow — hele markedet på ét sted.
          </p>
        </div>
      </div>
    </section>
  );
}
