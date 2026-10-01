"use client";

import { clsx } from "@/lib/clsx";
import { krFmt, tiers, yearly, type Period } from "@/lib/pricing";

/**
 * Two options for one plan inside a paywall or dialog: yearly (preselected,
 * with the saving) and monthly. Same facts as /priser, in less space.
 */
export function PeriodChoice({ tierId, period, onChange }: { tierId: string; period: Period; onChange: (p: Period) => void }) {
  const t = tiers.find((x) => x.id === tierId);
  const y = t ? yearly(t) : null;
  if (!t || !y || !t.annualLink) return null;
  const opts: { p: Period; title: string; price: string; note: string; badge?: string }[] = [
    { p: "year", title: "Årlig", price: `${krFmt(y.perMonth)} kr./md.`, note: `${krFmt(y.total)} kr. om året`, badge: `Spar ${krFmt(y.saves)} kr.` },
    { p: "month", title: "Månedlig", price: `${krFmt(t.price)} kr./md.`, note: "Opsig når som helst" },
  ];
  return (
    <div role="radiogroup" aria-label="Betaling" className="grid grid-cols-2 gap-2 text-left">
      {opts.map((o) => {
        const on = period === o.p;
        return (
          <button
            key={o.p}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.p)}
            className={clsx(
              "relative rounded-2xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              on ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            {o.badge && (
              <span className="absolute -top-2.5 right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">{o.badge}</span>
            )}
            <span className="block text-[13px] font-medium text-slate-500">{o.title}</span>
            <span className="mt-0.5 block text-[16px] font-semibold tabular-nums text-slate-900">{o.price}</span>
            <span className="block text-[12px] text-slate-500">{o.note}</span>
          </button>
        );
      })}
    </div>
  );
}
