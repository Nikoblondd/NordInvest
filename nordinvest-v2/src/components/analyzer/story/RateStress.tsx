"use client";

import { clsx } from "@/lib/clsx";

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");
const p1 = (n: number) => n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * How much rate pain the deal can take. A single gauge: green up to the
 * break-even rate, red beyond it, with a marker at today's rate — the gap
 * between marker and the red zone IS the safety margin, visible at a glance.
 */
export function RateStress({
  rate,
  breakEvenRate,
  cashFlowNow,
  stress,
}: {
  rate: number;
  breakEvenRate: number;
  cashFlowNow: number;
  stress: { rate: number; cashFlow: number }[];
}) {
  const be = Number.isFinite(breakEvenRate) ? breakEvenRate : rate;
  const max = Math.max(be, rate + 2, ...stress.map((s) => s.rate)) + 1;
  const pctOf = (x: number) => Math.max(0, Math.min(100, (x / max) * 100));
  const at = (x: number) => `${pctOf(x)}%`;
  const headroom = be - rate;

  const rows = [{ rate, cashFlow: cashFlowNow, now: true }, ...stress.map((s) => ({ ...s, now: false }))];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-500">Buffer før du taber penge</div>
          <div
            className={clsx(
              "font-display text-4xl font-bold tabular-nums tracking-[-0.03em]",
              headroom >= 2 ? "text-emerald-600" : headroom >= 0 ? "text-amber-600" : "text-rose-600",
            )}
          >
            {headroom >= 0 ? "+" : "−"}
            {p1(Math.abs(headroom))} <span className="text-2xl font-semibold text-slate-400">%-point</span>
          </div>
        </div>
        <p className="max-w-xs text-sm text-slate-500">
          {headroom >= 0
            ? `Renten kan stige fra ${p1(rate)} % til ${p1(be)} %, før cash flow bliver negativt.`
            : `Handlen taber allerede penge ved ${p1(rate)} %. Renten skal ned på ${p1(be)} %, før den går i nul.`}
        </p>
      </div>

      {/* Gauge */}
      <div className="relative mt-6 pb-7 pt-7">
        <div className="relative h-3 overflow-hidden rounded-full bg-rose-200">
          <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: at(be) }} />
        </div>
        <Marker pct={pctOf(rate)} label={`Din rente ${p1(rate)} %`} top />
        <Marker pct={pctOf(be)} label={`Break-even ${p1(be)} %`} />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {rows.map((r) => (
          <div
            key={r.rate}
            className={clsx(
              "rounded-xl p-3 ring-1 ring-inset",
              r.now ? "bg-slate-900 text-white ring-slate-900" : "bg-slate-50 ring-slate-200",
            )}
          >
            <div className={clsx("text-[11px] font-medium sm:text-xs", r.now ? "text-white/65" : "text-slate-500")}>
              {r.now ? "Nu" : "Ved"} {p1(r.rate)} %
            </div>
            <div
              className={clsx(
                "mt-1 whitespace-nowrap font-display text-lg font-semibold tabular-nums sm:text-xl",
                r.now
                  ? r.cashFlow >= 0 ? "text-emerald-300" : "text-rose-300"
                  : r.cashFlow >= 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {r.cashFlow >= 0 ? "+" : "−"}
              {dk(Math.abs(r.cashFlow))}
              <span className={clsx("ml-1 text-xs font-medium", r.now ? "text-white/50" : "text-slate-400")}>kr/md</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Marker({ pct, label, top }: { pct: number; label: string; top?: boolean }) {
  // Keep the label inside the gauge near either edge.
  const align = pct < 18 ? "translate-x-0" : pct > 82 ? "-translate-x-full" : "-translate-x-1/2";
  return (
    <div className="absolute inset-y-0" style={{ left: `${pct}%` }}>
      <div className="absolute top-5 h-7 -translate-x-1/2 border-l-2 border-slate-900" />
      <div
        className={clsx(
          "absolute whitespace-nowrap rounded-md bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white",
          align,
          top ? "top-0" : "bottom-0",
        )}
      >
        {label}
      </div>
    </div>
  );
}
