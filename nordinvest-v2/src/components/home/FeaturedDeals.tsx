"use client";

import Link from "next/link";
import { ArrowRight, Building2, Home as HomeIcon } from "lucide-react";
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
        <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-900 shadow-sm ring-1 ring-slate-200">
          Score {deal.score}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-semibold tabular-nums text-white">
          {deal.yieldPct.toFixed(1)} %
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <div className="truncate text-[13px] text-slate-500">
            {deal.typeLabel}, {deal.zip} {deal.city}
          </div>
          <h3 className="mt-0.5 truncate text-base font-semibold text-slate-900">
            {deal.address}
          </h3>
        </div>

        <div className="grid grid-cols-3 rounded-xl bg-slate-50 py-2.5 text-center ring-1 ring-slate-100 [&>div+div]:border-l [&>div+div]:border-slate-200/80">
          <div>
            <div className="text-xs text-slate-500">Pris</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
              {krCompact(deal.price)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Areal</div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{deal.area} m²</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">
              {deal.cashFlowMonth != null ? "Cash flow/md." : "Afkast"}
            </div>
            <div className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-700">
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
          {/* Not an <a>: an anchor inside the card's <Link> is invalid HTML
              and broke hydration. A link-role span opens the listing instead. */}
          <span
            role="link"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(deal.sourceUrl, "_blank", "noopener,noreferrer");
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              e.stopPropagation();
              window.open(deal.sourceUrl, "_blank", "noopener,noreferrer");
            }}
            className="relative z-10 -my-2 cursor-pointer py-2 text-[13px] text-slate-500 hover:text-slate-700"
          >
            Se opslag ↗
          </span>
        </div>
      </div>
    </Link>
  );
}

// Phones: one swipeable row per category (cards peek in from the right), so six
// full-width photo cards don't turn into a wall. From `sm:` up it is a grid.
const dealRow =
  "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3";
const dealCell = "flex w-[84%] shrink-0 snap-start sm:w-auto [&>a]:w-full";

/**
 * Landing-page "Deal-motoren" showcase. Sits right below the analyze-your-own
 * input, positions the deal-motor as the second core surface, and features the
 * current month's top-3 residential and top-3 commercial deals pulled from
 * `lib/featured-deals.ts` (refreshed monthly, sourced from the live engine).
 */
export function FeaturedDeals() {
  return (
    <section id="maanedens-deals" className="border-t border-slate-200/80 px-4 py-16 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-start text-left sm:mb-10 sm:items-center sm:text-center">
          <p className="mb-4 text-sm font-medium text-blue-700">Deal-motoren, {FEATURED_MONTH_LABEL.toLowerCase()}</p>
          <h2 className="max-w-3xl font-thesis text-[2.5rem] font-normal leading-[1.06] tracking-[0.005em] text-[#0b1b33] [text-wrap:balance] sm:text-[3.4rem] sm:leading-[1.02] sm:tracking-[-0.01em]">
            Månedens bedste handler
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Deal-motoren gennemgår boliger til salg i hele Danmark og sorterer dem efter cashflow,
            afkast og risiko. Her er top 3 i hver kategori.
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
          <div className={dealRow}>
            {FEATURED_RESIDENTIAL.map((d) => (
              <div key={d.sourceUrl} className={dealCell}>
                <DealCard deal={d} />
              </div>
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
          <div className={dealRow}>
            {FEATURED_COMMERCIAL.map((d) => (
              <div key={d.sourceUrl} className={dealCell}>
                <DealCard deal={d} />
              </div>
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
            Filtrér på by, pris, afkast og cashflow.
          </p>
        </div>
      </div>
    </section>
  );
}
