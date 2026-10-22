"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { analyze } from "@/lib/analysis";
import { budget, stress, type OpsFacts } from "@/lib/investment-ops";

/*
 * The box a listing portal puts on an investment listing (in an iframe, from
 * /embed/analyse/<id>): the three numbers a buyer asks first, on the seller's
 * figures, with the down payment and today's rate to adjust. Everything else
 * (the prudent budget, stress test, scenarios, BBR, the report) is in the full
 * analysis on NordInvest, which the button opens. Hosted by us: the portal
 * embeds one line and owns nothing it can take along.
 */

export type TeaserListing = { id: string; price: number; returnPercent: number; operatingCost: number | null; area: number | null; subcategory: string | null };

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");
const pct = (n: number) => n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function TeaserBox({ listing: l, rate: marketRate, rateLabel, fullHref }: { listing: TeaserListing; rate: number; rateLabel: string | null; fullHref: string }) {
  const [dp, setDp] = useState(40);
  const [rate, setRate] = useState(marketRate);
  const facts: OpsFacts = { price: l.price, noi: (l.returnPercent / 100) * l.price, opex: l.operatingCost, area: l.area, builtYear: null, subcat: l.subcategory };
  const b = budget(facts);
  const r = useMemo(() => analyze({ price: l.price, monthlyRent: b.noi / 12, downPaymentPct: dp, interestRate: rate, monthlyOpex: 0, vacancyPct: 0, maintenancePct: 0 }), [l.price, b.noi, dp, rate]);
  const s = stress(b, l.price, { downPaymentPct: dp, ratePct: rate, termYears: 30 });
  const good = r.cashFlow >= 0;

  return (
    <div className="flex h-full flex-col rounded-2xl bg-white p-4 text-slate-900 ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-semibold tracking-[-0.01em]">Hvad giver ejendommen?</p>
        <p className="text-[11px] font-medium text-slate-500">På sælgers tal</p>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">Cash flow pr. md.</dt>
          <dd className={`mt-0.5 text-[18px] font-semibold tabular-nums ${good ? "text-emerald-700" : "text-rose-700"}`}>{good ? "+" : "−"}{dk(Math.abs(r.cashFlow))} kr</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">Afkast på egen kapital</dt>
          <dd className="mt-0.5 text-[18px] font-semibold tabular-nums">{pct(r.cashOnCash)} %</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
          <dt className="text-[11px] font-medium text-slate-500">Driften kan falde</dt>
          <dd className="mt-0.5 text-[18px] font-semibold tabular-nums">{good ? `${Math.round(s.tolerancePct)} %` : "0 %"}</dd>
        </div>
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="flex justify-between text-[12px] text-slate-600"><span>Udbetaling</span><span className="font-semibold tabular-nums text-slate-900">{dp} %</span></span>
          <input type="range" min={20} max={100} step={5} value={dp} onChange={(e) => setDp(Number(e.target.value))} className="mt-1 w-full accent-blue-600" aria-label="Udbetaling i procent" />
        </label>
        <label className="block">
          <span className="flex justify-between text-[12px] text-slate-600"><span>Rente</span><span className="font-semibold tabular-nums text-slate-900">{pct(rate)} %</span></span>
          <input type="range" min={1} max={9} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-1 w-full accent-blue-600" aria-label="Rente i procent" />
        </label>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
        Driftsresultat fra annoncen ({pct(l.returnPercent)} % af prisen). {rateLabel ? `Renten er ${rateLabel}.` : ""} Egen kapital inkl. købsomkostninger.
      </p>

      <a href={fullHref} target="_blank" rel="noopener" className="mt-auto flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 pt-0 text-[14px] font-semibold text-white hover:bg-slate-800">
        Se den fulde analyse <ArrowUpRight size={16} />
      </a>
      <p className="mt-2 text-center text-[11px] text-slate-500">Stresstest, vedligehold, BBR og bankrapport · <span className="font-semibold text-slate-700">Beregnet af NordInvest</span></p>
    </div>
  );
}
