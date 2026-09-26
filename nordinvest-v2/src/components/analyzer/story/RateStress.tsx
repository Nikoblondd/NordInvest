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
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-[15px] font-medium text-slate-500">Buffer før du taber penge</div>
          <div
            className={clsx(
              "mt-1 text-[44px] font-semibold leading-none tabular-nums tracking-[-0.035em] sm:text-[56px]",
              headroom >= 2 ? "text-emerald-600" : headroom >= 0 ? "text-amber-600" : "text-rose-600",
            )}
          >
            {headroom >= 0 ? "+" : "−"}
            {p1(Math.abs(headroom))}
            <span className="ml-1.5 text-2xl font-medium tracking-normal text-slate-400">%-point</span>
          </div>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-slate-500">
          {headroom >= 0
            ? `Renten kan stige fra ${p1(rate)} % til ${p1(be)} %, før cash flow bliver negativt.`
            : `Handlen taber allerede penge ved ${p1(rate)} %. Renten skal ned på ${p1(be)} %, før den går i nul.`}
        </p>
      </div>

      {/* Gauge: green up to break-even, red beyond. The gap between the two markers is the buffer. */}
      <div
        role="img"
        aria-label={`Din rente ${p1(rate)} %, break-even ved ${p1(be)} %`}
        className="relative mt-8 pb-8 pt-8"
      >
        <div className="relative h-2 overflow-hidden rounded-full bg-rose-200">
          <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: at(be) }} />
        </div>
        <Marker pct={pctOf(rate)} label={`Din rente ${p1(rate)} %`} top />
        <Marker pct={pctOf(be)} label={`Break-even ${p1(be)} %`} />
      </div>

      <dl className="mt-2 grid grid-cols-3 border-t border-slate-200 pt-5">
        {rows.map((r, i) => (
          <div key={r.rate} className={clsx("min-w-0", i > 0 && "border-l border-slate-200 pl-4 sm:pl-6")}>
            <dt className={clsx("text-[13px] sm:text-sm", r.now ? "font-semibold text-slate-900" : "font-medium text-slate-500")}>
              {r.now ? "Nu" : "Ved"} {p1(r.rate)}&nbsp;%
            </dt>
            <dd
              className={clsx(
                "mt-1 whitespace-nowrap text-xl font-semibold tabular-nums tracking-[-0.02em] sm:text-2xl",
                r.cashFlow >= 0 ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {r.cashFlow >= 0 ? "+" : "−"}
              {dk(Math.abs(r.cashFlow))}
              <span className="block text-xs font-medium tracking-normal text-slate-400 sm:ml-1 sm:inline sm:text-sm">kr/md.</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Marker({ pct, label, top }: { pct: number; label: string; top?: boolean }) {
  // Keep the label inside the gauge near either edge.
  const align = pct < 18 ? "translate-x-0" : pct > 82 ? "-translate-x-full" : "-translate-x-1/2";
  return (
    <div className="absolute inset-y-0" style={{ left: `${pct}%` }}>
      <div className="absolute top-6 h-6 -translate-x-1/2 border-l-2 border-slate-900" />
      <div
        className={clsx(
          "absolute whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white",
          align,
          top ? "top-0" : "bottom-0",
        )}
      >
        {label}
      </div>
    </div>
  );
}
