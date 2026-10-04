"use client";

import { useState } from "react";
import { WealthChart, type WealthYear } from "./WealthChart";
import { clsx } from "@/lib/clsx";

const dk = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("da-DK") : "–");

/**
 * The long game: what the deal becomes over the hold period. Three outcome
 * numbers up top (the answer), then a year scrubber: pick a year and see the
 * friværdi split into what you paid in, what the loan repayments built and
 * what the market added, with the chart below following the same year.
 */
export function ProjectionStory({
  data,
  downPayment,
  holdYears,
  totalProfit,
  netSaleProceeds,
  irr,
  appreciationLabel,
  rentGrowthLabel,
}: {
  data: WealthYear[];
  downPayment: number;
  holdYears: number;
  totalProfit: number;
  netSaleProceeds: number;
  irr: number;
  appreciationLabel: string;
  rentGrowthLabel: string;
}) {
  const [sel, setSel] = useState(Math.max(0, data.length - 1));
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

      {data.length > 0 && <YearScrubber data={data} downPayment={downPayment} sel={Math.min(sel, data.length - 1)} onSel={setSel} />}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-slate-900">Opbygning af formue over {holdYears} år</h3>
          <p className="text-sm text-slate-500">
            Antager {appreciationLabel} værdistigning og {rentGrowthLabel} lejevækst om året
          </p>
        </div>
        <div className="mt-4">
          <WealthChart data={data} selected={Math.min(sel, data.length - 1)} onSelect={setSel} />
        </div>
      </div>
    </div>
  );
}

function YearScrubber({ data, downPayment, sel, onSel }: { data: WealthYear[]; downPayment: number; sel: number; onSel: (i: number) => void }) {
  const d = data[sel];
  const repaid = Math.max(0, d.paid - downPayment);
  const growth = d.growth;
  const equity = d.paid + growth;
  const parts = [
    { label: "Udbetaling", value: Math.max(0, downPayment + Math.min(0, growth)), bar: "bg-[#a9c4fb]" },
    { label: "Afdrag", value: repaid, bar: "bg-blue-400" },
    { label: "Værdi\u00ADstigning", value: Math.max(0, growth), bar: "bg-blue-600" },
  ];
  const total = Math.max(1, parts.reduce((a, p) => a + p.value, 0));
  const pctDone = data.length > 1 ? (sel / (data.length - 1)) * 100 : 100;

  return (
    <div className="mt-8 rounded-2xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-200/70 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-[15px] font-medium text-slate-500">Friværdi efter år {d.year}</div>
          <div className="mt-1 whitespace-nowrap text-[36px] font-semibold leading-none tabular-nums tracking-[-0.035em] text-slate-900 sm:text-[44px]" aria-live="polite">
            {dk(equity)}
            <span className="ml-1.5 text-xl font-medium tracking-normal text-slate-400">kr</span>
          </div>
        </div>
        <div className="sm:text-right">
          <div className="text-[13px] font-medium text-slate-500">Samlet cash flow</div>
          <div className={clsx("text-[20px] font-semibold tabular-nums", d.cumulativeCashFlow >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {d.cumulativeCashFlow >= 0 ? "+" : "−"}{dk(Math.abs(d.cumulativeCashFlow))} kr
          </div>
        </div>
      </div>

      <div className="mt-5 flex h-9 overflow-hidden rounded-lg" aria-hidden>
        {parts.map((p) =>
          p.value > 0 ? (
            <div
              key={p.label}
              className={clsx("flex items-center justify-center border-r-2 border-slate-50 text-[12px] font-semibold tabular-nums transition-[flex-grow] duration-300 last:border-r-0", p.bar, p.bar === "bg-[#a9c4fb]" ? "text-slate-900" : "text-white")}
              style={{ flexGrow: p.value, flexBasis: 0 }}
            >
              {p.value / total > 0.16 && dk(p.value)}
            </div>
          ) : null,
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        {parts.map((p) => (
          <div key={p.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[12px] text-slate-500 sm:text-[13px]">
              <span aria-hidden className={clsx("h-2 w-2 shrink-0 rounded-full", p.bar)} />
              <span className="min-w-0 leading-tight [hyphens:manual]">{p.label}</span>
            </dt>
            <dd className="mt-0.5 whitespace-nowrap text-[14px] font-semibold tabular-nums text-slate-900 sm:text-[15px]">{dk(p.value)} kr</dd>
          </div>
        ))}
      </dl>
      {growth < 0 && (
        <p className="mt-3 text-[14px] text-rose-700">Boligen er {dk(Math.abs(growth))} kr mindre værd end købsprisen i år {d.year}. Det er trukket fra udbetalingen.</p>
      )}

      <div className="mt-6">
        <input
          type="range"
          className="ni-range"
          min={0}
          max={data.length - 1}
          step={1}
          value={sel}
          onChange={(e) => onSel(Number(e.target.value))}
          aria-label="Vælg år"
          aria-valuetext={`År ${d.year}: friværdi ${dk(equity)} kroner`}
          style={{ background: `linear-gradient(to right, #2563eb 0%, #2563eb ${pctDone}%, #e2e8f0 ${pctDone}%, #e2e8f0 100%)` }}
        />
        <div aria-hidden className="mt-2 flex justify-between text-[12px] tabular-nums text-slate-400">
          <span>År {data[0].year}</span>
          <span className="text-slate-500">Træk for at se et andet år</span>
          <span>År {data[data.length - 1].year}</span>
        </div>
      </div>
    </div>
  );
}
