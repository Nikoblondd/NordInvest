"use client";

import Link from "next/link";
import { ArrowRight, Building2, Home as HomeIcon, TrendingUp } from "lucide-react";
import {
  FEATURED_COMMERCIAL,
  FEATURED_MONTH_LABEL,
  FEATURED_RESIDENTIAL,
  type FeaturedDeal,
} from "@/lib/featured-deals";

const krCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)} mio`;
  return `${Math.round(n / 1000)}k`;
};

function DealCard({ deal }: { deal: FeaturedDeal }) {
  // Whole card is a tap-target that opens the analyzer with the deal pre-filled.
  // The "Se opslag ↗" link is layered on top with stopPropagation so it doesn't
  // steal the outer tap. This matches how every mobile listing UI (Boligsiden,
  // Airbnb, etc.) works — you tap the image, you get the detail view.
  return (
    <Link
      href={deal.analyzeUrl}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      aria-label={`Analyser ${deal.address}, ${deal.zip} ${deal.city}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 sm:aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={deal.image}
          alt={`${deal.address}, ${deal.zip} ${deal.city}`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
          <span className="text-emerald-600">●</span>
          Score {deal.score}
        </div>
        <div className="absolute right-2 top-2 rounded-full bg-slate-900/85 px-2 py-0.5 text-[11px] font-semibold text-white sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
          {deal.yieldPct.toFixed(1)} %
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">
            {deal.typeLabel} · {deal.zip} {deal.city}
          </div>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900 sm:mt-1 sm:text-base">
            {deal.address}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-50 p-2 text-center ring-1 ring-slate-100 sm:gap-2 sm:p-3">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-500 sm:text-[10px]">Pris</div>
            <div className="text-xs font-semibold text-slate-900 sm:text-sm">
              {krCompact(deal.price)}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-500 sm:text-[10px]">Areal</div>
            <div className="text-xs font-semibold text-slate-900 sm:text-sm">{deal.area} m²</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-500 sm:text-[10px]">
              {deal.cashFlowMonth != null ? "CF/md" : "Afkast"}
            </div>
            <div className="text-xs font-semibold text-emerald-700 sm:text-sm">
              {deal.cashFlowMonth != null
                ? `+${krCompact(deal.cashFlowMonth)}`
                : `${deal.yieldPct.toFixed(1)} %`}
            </div>
          </div>
        </div>

        {/* Highlight kept but hidden on the tightest phones — the metrics grid
            already carries the story. Shows from `sm:` up. */}
        <p className="hidden text-xs text-slate-600 sm:block">{deal.highlight}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-sm sm:pt-2">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:text-blue-700">
            Analyser <ArrowRight className="h-3.5 w-3.5" />
          </span>
          {/* External source link sits inside the card but stops event propagation
              so it doesn't hijack the whole-card tap. */}
          <a
            href={deal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 text-xs text-slate-400 hover:text-slate-600"
          >
            Se opslag ↗
          </a>
        </div>
      </div>
    </Link>
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
    <section id="maanedens-deals" className="bg-slate-50 px-4 py-14 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:mb-4">
            <TrendingUp className="h-3 w-3 text-blue-500" />
            Deal-motoren · {FEATURED_MONTH_LABEL}
          </div>
          <h2 className="max-w-3xl text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">
            Vi finder de bedste deals — så du ikke skal
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate-500 sm:text-lg">
            Vi scanner hele det danske marked og rangerer på cashflow, afkast og risiko.
            Her er top 3 for {FEATURED_MONTH_LABEL.toLowerCase()}.
          </p>
        </div>

        {/* Residential top 3 */}
        <div className="mb-10 sm:mb-14">
          <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <HomeIcon className="h-4 w-4 text-slate-700 sm:h-5 sm:w-5" />
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {FEATURED_RESIDENTIAL.map((d) => (
              <DealCard key={d.sourceUrl} deal={d} />
            ))}
          </div>
        </div>

        {/* Commercial top 3 */}
        <div>
          <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-700 sm:h-5 sm:w-5" />
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {FEATURED_COMMERCIAL.map((d) => (
              <DealCard key={d.sourceUrl} deal={d} />
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center sm:mt-12">
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
