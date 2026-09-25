"use client";

import { WealthChart, type WealthYear } from "./WealthChart";
import { clsx } from "@/lib/clsx";

const dk = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("da-DK") : "–");

/**
 * The long game: what the deal becomes over the hold period. Three outcome
 * numbers up top (the answer), the equity + cumulative cash-flow curves under
 * them (the proof).
 */
export function ProjectionStory({
  data,
  holdYears,
  totalProfit,
  netSaleProceeds,
  irr,
  appreciationLabel,
  rentGrowthLabel,
}: {
  data: WealthYear[];
  holdYears: number;
  totalProfit: number;
  netSaleProceeds: number;
  irr: number;
  appreciationLabel: string;
  rentGrowthLabel: string;
}) {
  const stats = [
    {
      label: `Samlet gevinst efter ${holdYears} år`,
      value: `${totalProfit >= 0 ? "+" : "−"}${dk(Math.abs(totalProfit))}`,
      unit: "kr",
      tone: totalProfit >= 0 ? "text-emerald-600" : "text-rose-600",
    },
    { label: "Nettoprovenu ved salg", value: dk(netSaleProceeds), unit: "kr", tone: "text-slate-900" },
    {
      label: "Årligt afkast (IRR)",
      value: Number.isFinite(irr) ? irr.toLocaleString("da-DK", { maximumFractionDigits: 1 }) : "–",
      unit: "%",
      tone: Number.isFinite(irr) && irr >= 8 ? "text-emerald-600" : "text-slate-900",
    },
  ];

  return (
    <div>
      <dl className="grid gap-y-5 sm:grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.label} className={clsx("min-w-0", i > 0 && "sm:border-l sm:border-slate-200 sm:pl-6")}>
            <dt className="truncate text-[15px] font-medium text-slate-500">{s.label}</dt>
            <dd className={clsx("mt-1 whitespace-nowrap text-[32px] font-semibold leading-tight tabular-nums tracking-[-0.03em] sm:text-[38px]", s.tone)}>
              {s.value}
              <span className="ml-1 text-lg font-medium tracking-normal text-slate-400">{s.unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-slate-900">Opbygning af formue over {holdYears} år</h3>
          <p className="text-sm text-slate-500">
            Antager {appreciationLabel} værdistigning og {rentGrowthLabel} lejevækst om året
          </p>
        </div>
        <div className="mt-4">
          <WealthChart data={data} />
        </div>
      </div>
    </div>
  );
}
