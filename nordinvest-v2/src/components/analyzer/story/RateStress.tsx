"use client";

import { useState } from "react";
import { annuity } from "@/lib/analysis";
import { clsx } from "@/lib/clsx";

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");
const p1 = (n: number) => n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * How much rate pain the deal can take, as something to try: drag the rate and
 * the monthly cash flow is recalculated with the same loan, term and running
 * costs. The track is green up to the break-even rate and red after it, so the
 * buffer is the distance between today's marker and the colour change.
 */
export function RateStress({
  rate,
  breakEvenRate,
  loan,
  termYears,
  noiMonthly,
}: {
  rate: number;
  breakEvenRate: number;
  loan: number;
  termYears: number;
  noiMonthly: number;
}) {
  const [test, setTest] = useState(rate);
  const be = Number.isFinite(breakEvenRate) ? breakEvenRate : rate;
  const max = Math.max(8, Math.ceil(Math.max(be, rate) + 3));
  const cf = (r: number) => noiMonthly - annuity(loan, r, termYears);
  const now = cf(rate);
  const atTest = cf(test);
  const diff = atTest - now;
  const headroom = be - rate;
  const pos = (x: number) => Math.max(0, Math.min(100, (x / max) * 100));
  const changed = Math.abs(test - rate) > 0.001;

  const track = `linear-gradient(to right, #10b981 0%, #10b981 ${pos(be)}%, #fb7185 ${pos(be)}%, #fb7185 100%)`;
  const presets = [0, 1, 2, 3].map((d) => ({ d, r: Math.min(max, rate + d) }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium text-slate-500">
            Cash flow ved <span className="font-semibold text-slate-900 tabular-nums">{p1(test)} %</span> rente
          </div>
          <div
            aria-live="polite"
            className={clsx(
              "mt-1 whitespace-nowrap text-[44px] font-semibold leading-none tabular-nums tracking-[-0.035em] sm:text-[56px]",
              atTest >= 0 ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {atTest >= 0 ? "+" : "−"}
            {dk(Math.abs(atTest))}
            <span className="ml-1.5 text-2xl font-medium tracking-normal text-slate-400">kr/md.</span>
          </div>
          <p className={clsx("mt-2 h-5 text-[14px] tabular-nums", diff < 0 ? "text-rose-600" : "text-emerald-700")}>
            {changed && <>{diff < 0 ? "−" : "+"}{dk(Math.abs(diff))} kr om måneden i forhold til i dag</>}
          </p>
        </div>
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-3 py-1.5 text-[14px] font-semibold ring-1 ring-inset",
            headroom >= 2 ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : headroom >= 0 ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-rose-50 text-rose-800 ring-rose-200",
          )}
        >
          Buffer {headroom >= 0 ? "+" : "−"}{p1(Math.abs(headroom))} %-point
        </span>
      </div>

      <div className="relative mt-10">
        {/* thumb label */}
        <div className="pointer-events-none absolute -top-8" style={{ left: `calc(${pos(test)}% + ${14 - pos(test) * 0.28}px)` }}>
          <span className="block -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white">
            Rente {p1(test)} %
          </span>
        </div>
        <input
          type="range"
          className="ni-range"
          min={0}
          max={max}
          step={0.05}
          value={test}
          onChange={(e) => setTest(Number(e.target.value))}
          aria-label="Prøv en anden rente"
          aria-valuetext={`${p1(test)} procent, cash flow ${dk(atTest)} kroner om måneden`}
          style={{ background: track }}
        />
        {/* today and break-even ticks */}
        <div aria-hidden className="relative mt-2 h-12 text-[12px]">
          <Tick at={pos(rate)} label={`Aktuel ${p1(rate)} %`} />
          <Tick at={pos(be)} label={`Break-even ${p1(be)} %`} strong low={Math.abs(pos(be) - pos(rate)) < 28} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
        {presets.map(({ d, r }) => (
          <button
            key={d}
            type="button"
            onClick={() => setTest(r)}
            aria-pressed={Math.abs(test - r) < 0.001}
            className={clsx(
              "min-h-10 rounded-full px-4 text-[14px] font-semibold tabular-nums ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              Math.abs(test - r) < 0.001 ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
            )}
          >
            {d === 0 ? "Aktuel rente" : `+${d} procentpoint`}
          </button>
        ))}
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
        {headroom >= 0
          ? `Renten kan stige fra ${p1(rate)} % til ${p1(be)} %, før cash flow bliver negativt. Træk i skyderen for at se effekten af en anden rente.`
          : `Cash flow er negativt ved ${p1(rate)} %. Break-even-renten er ${p1(be)} %.`}
      </p>
    </div>
  );
}

function Tick({ at, label, strong, low }: { at: number; label: string; strong?: boolean; low?: boolean }) {
  const align = at < 15 ? "translate-x-0" : at > 85 ? "-translate-x-full" : "-translate-x-1/2";
  return (
    <div className="absolute top-0" style={{ left: `${at}%` }}>
      <div className={clsx("border-l-2", low ? "h-6" : "h-2.5", strong ? "border-slate-900" : "border-slate-400")} />
      <span className={clsx("absolute block", low ? "top-[26px]" : "top-3", "whitespace-nowrap", align, strong ? "font-semibold text-slate-900" : "text-slate-500")}>{label}</span>
    </div>
  );
}
