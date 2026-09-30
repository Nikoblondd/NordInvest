"use client";

import { BadgeCheck, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { PriceBenchmark } from "@/lib/reference";

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

/**
 * Documented market comparison — the property's price pr. m² against the median
 * for its landsdel + type, from NordInvest's own scraped market. A fully sourced
 * figure the analysis never had before: is the asking price on the market level?
 */
export function MarketBenchmark({
  propertyPriceM2,
  benchmark,
}: {
  propertyPriceM2: number;
  benchmark: PriceBenchmark;
}) {
  const deltaPct = ((propertyPriceM2 - benchmark.value) / benchmark.value) * 100;
  const rounded = Math.round(deltaPct);
  const near = Math.abs(rounded) <= 3;
  const over = rounded > 3;

  const tone = near ? "text-slate-600" : over ? "text-amber-700" : "text-emerald-700";
  const Icon = near ? Minus : over ? TrendingUp : TrendingDown;
  const verdict = near
    ? "på niveau med markedet"
    : over
    ? `${rounded} % over markedsmedianen`
    : `${Math.abs(rounded)} % under markedsmedianen`;

  const scopeNote =
    benchmark.scope === "region-type"
      ? `${benchmark.typeLabel.toLowerCase()} i ${benchmark.regionLabel}`
      : benchmark.scope === "region"
      ? `boliger i ${benchmark.regionLabel}`
      : "hele landet";

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <BadgeCheck size={16} className="text-emerald-600" />
        <h3 className="text-[15px] font-semibold text-slate-900">Markedspris pr. m²</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          Dokumenteret
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 items-end gap-4">
        <div>
          <div className="text-[13px] font-medium leading-snug text-slate-500">Denne bolig</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-slate-900">
            {dk(propertyPriceM2)} <span className="text-sm font-semibold text-slate-400">kr/m²</span>
          </div>
        </div>
        <div>
          <div className="text-[13px] font-medium leading-snug text-slate-500">Median · {scopeNote}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-slate-900">
            {dk(benchmark.value)} <span className="text-sm font-semibold text-slate-400">kr/m²</span>
          </div>
        </div>
      </div>

      <div className={clsx("mt-4 flex items-center gap-2 text-sm font-semibold", tone)}>
        <Icon size={16} />
        <span>Prisen ligger {verdict}.</span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Kilde: {benchmark.source}, opdateret {benchmark.asOf}. Medianpris pr. m² for sammenlignelige
        udbudte boliger — ikke en vurdering af den enkelte bolig.
      </p>
    </section>
  );
}
