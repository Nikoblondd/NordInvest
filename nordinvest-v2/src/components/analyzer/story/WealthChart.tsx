"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { clsx } from "@/lib/clsx";

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

export type WealthYear = {
  year: number;
  /** Down payment plus everything repaid on the loan so far (price − loan balance). */
  paid: number;
  /** Market value above the purchase price (value − price). Can be negative. */
  growth: number;
  /** Cash flow received (or paid in) so far. Can be negative. */
  cumulativeCashFlow: number;
};

/**
 * How the wealth is built, year by year. Design generated with an image model
 * (Canva) and rebuilt here so the numbers stay live: slim stacked bars for
 * friværdi (light = udbetaling + afdrag, dark = værdistigning), a green line
 * for the cash flow collected so far, and pills naming the end values.
 * Hover or focus a year for its exact numbers.
 */
export function WealthChart({ data, selected, onSelect }: { data: WealthYear[]; selected?: number | null; onSelect?: (i: number) => void }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  // Watch the chart box, not the bars: a bar at scaleY(0) has no height and
  // would never register as on screen.
  const boxRef = useRef<HTMLDivElement>(null);
  const seen = useInView(boxRef, { once: true, margin: "-40px 0px" });
  const show = seen || !!reduce;
  if (data.length === 0) return null;

  // Light segment = what you paid in and paid off; dark = value growth. A fall
  // in value eats into the light segment instead of drawing below zero.
  const light = (d: WealthYear) => Math.max(0, d.paid + Math.min(0, d.growth));
  const equity = (d: WealthYear) => light(d) + Math.max(0, d.growth);
  const top = Math.max(...data.map((d) => Math.max(equity(d), d.cumulativeCashFlow)), 1);
  const bottom = Math.min(0, ...data.map((d) => d.cumulativeCashFlow));
  const maxV = top * 1.16; // headroom for the end pill
  const minV = bottom < 0 ? bottom * 1.35 : 0;
  const y = (v: number) => ((maxV - v) / (maxV - minV)) * 100; // % from the top
  const zeroY = y(0);
  const colX = (i: number) => ((i + 0.5) / data.length) * 100;

  const last = data[data.length - 1];
  const lastEquity = last.paid + last.growth;
  const cfPositive = last.cumulativeCashFlow >= 0;
  // The two end pills sit at their values; when those are close, the cash
  // flow pill moves below its dot so they never overlap.
  const pillsClash = Math.abs(y(equity(last)) - y(last.cumulativeCashFlow)) < 16;
  const linePts = data.map((d, i) => `${colX(i)},${y(d.cumulativeCashFlow)}`).join(" ");
  // Controlled by the year scrubber when onSelect is given; hover then moves the
  // scrubber instead of opening a tooltip.
  const shown = onSelect ? (selected ?? null) : (active ?? null);
  const pick = (i: number) => (onSelect ? onSelect(i) : setActive(i));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-[#a9c4fb]" /> Udbetaling og afdrag
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-[3px] bg-blue-600" /> Værdistigning
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 rounded-full bg-emerald-500" /> Samlet cash flow
        </span>
      </div>

      <div
        ref={boxRef}
        className="relative mt-6 h-[280px] sm:h-[340px]"
        role="img"
        aria-label={`Friværdi efter ${last.year} år: ${dk(lastEquity)} kr, heraf ${dk(last.growth)} kr i værdistigning. Samlet cash flow: ${dk(last.cumulativeCashFlow)} kr.`}
        onMouseLeave={() => !onSelect && setActive(null)}
      >
        {/* faint guides + zero baseline */}
        {[0.25, 0.5, 0.75].map((f) => (
          <div key={f} aria-hidden className="absolute inset-x-0 border-t border-dashed border-slate-200/80" style={{ top: `${f * 100}%` }} />
        ))}
        <div aria-hidden className="absolute inset-x-0 border-t border-slate-300" style={{ top: `${zeroY}%` }} />

        {/* bars */}
        <div aria-hidden className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((d, i) => {
            const paidTop = y(light(d));
            const eqTop = y(equity(d));
            return (
              <div key={d.year} className="relative">
                <div
                  className={clsx(
                    "absolute inset-y-0 left-1/2 w-[58%] max-w-[44px] -translate-x-1/2 rounded-lg transition-colors",
                    shown === i ? "bg-slate-900/[0.04]" : "bg-transparent",
                  )}
                />
                {/* Grows in once seen; never stays at zero height if the
                    observer misses (a chapter opened from a link). */}
                <motion.div
                  className="absolute left-1/2 w-[46%] max-w-[34px] -translate-x-1/2 origin-bottom"
                  style={{ top: `${eqTop}%`, bottom: `${100 - zeroY}%` }}
                  initial={reduce ? false : { scaleY: 0.0001 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.7, delay: reduce ? 0 : (show ? 0 : 0.2) + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="absolute inset-x-0 top-0 rounded-t-[7px] bg-blue-600" style={{ height: `${((paidTop - eqTop) / (zeroY - eqTop || 1)) * 100}%` }} />
                  <div
                    className={clsx("absolute inset-x-0 bottom-0 rounded-b-[3px] bg-[#a9c4fb]", paidTop - eqTop < 0.5 && "rounded-t-[7px]")}
                    style={{ top: `${((paidTop - eqTop) / (zeroY - eqTop || 1)) * 100}%` }}
                  />
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* cash flow line (non-scaling stroke), dots as HTML so they stay round */}
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <motion.polyline
            points={linePts}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.25"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: reduce ? 0 : 0.45 }}
          />
        </svg>
        {data.map((d, i) => (
          <span
            key={d.year}
            aria-hidden
            className={clsx(
              "absolute -ml-[4px] -mt-[4px] h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white transition-transform",
              shown === i && "scale-150",
            )}
            style={{ left: `${colX(i)}%`, top: `${y(d.cumulativeCashFlow)}%` }}
          />
        ))}

        {/* end pills */}
        <span
          aria-hidden
          className="absolute -translate-x-full whitespace-nowrap rounded-full bg-blue-600 px-3 py-1 text-[13px] font-semibold tabular-nums text-white shadow-[0_6px_16px_-6px_rgba(37, 52, 90,0.6)]"
          style={{ left: `calc(${colX(data.length - 1)}% + 18px)`, top: `calc(${y(equity(last))}% - 36px)` }}
        >
          {dk(lastEquity)} kr.
        </span>
        <span
          aria-hidden
          className={clsx(
            "absolute -translate-x-full whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset",
            cfPositive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200",
          )}
          style={{ left: `calc(${colX(data.length - 1)}% - 12px)`, top: pillsClash ? `calc(${y(last.cumulativeCashFlow)}% + 12px)` : `calc(${y(last.cumulativeCashFlow)}% - 11px)` }}
        >
          {cfPositive ? "+" : "−"}
          {dk(Math.abs(last.cumulativeCashFlow))} kr.
        </span>

        {/* hover / focus targets per year */}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          {data.map((d, i) => (
            <button
              key={d.year}
              type="button"
              aria-label={`År ${d.year}: friværdi ${dk(d.paid + d.growth)} kr, samlet cash flow ${dk(d.cumulativeCashFlow)} kr`}
              onMouseEnter={() => pick(i)}
              onFocus={() => pick(i)}
              onBlur={() => !onSelect && setActive(null)}
              onClick={() => pick(i)}
              className="h-full cursor-default rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
            />
          ))}
        </div>

        {shown !== null && !onSelect && (
          <div
            aria-hidden
            className={clsx(
              "pointer-events-none absolute top-2 z-10 w-[250px] rounded-xl border border-slate-200 bg-white p-3.5 text-[13px] shadow-[0_14px_34px_-12px_rgba(15,23,42,0.28)]",
              colX(shown) > 60 ? "-translate-x-[calc(100%+14px)]" : "translate-x-[14px]",
            )}
            style={{ left: `${colX(shown)}%` }}
          >
            <div className="text-[15px] font-semibold text-slate-900">År {data[shown].year}</div>
            <dl className="mt-2 space-y-1.5 tabular-nums">
              <TipRow color="bg-[#a9c4fb]" label="Udbetaling og afdrag" value={data[shown].paid} />
              <TipRow color="bg-blue-600" label="Værdistigning" value={data[shown].growth} />
              <div className="border-t border-slate-100 pt-1.5">
                <TipRow label="Friværdi" value={data[shown].paid + data[shown].growth} strong />
              </div>
              <TipRow color="bg-emerald-500" label="Samlet cash flow" value={data[shown].cumulativeCashFlow} />
            </dl>
          </div>
        )}
      </div>

      {/* x axis */}
      <div aria-hidden className="mt-3 grid text-center text-xs text-slate-400" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((d, i) => (
          <span key={d.year} className={clsx("tabular-nums", data.length > 12 && i % 2 === 1 && "invisible", shown === i && "font-semibold text-slate-900")}>
            {data.length <= 12 && <span className="hidden sm:inline">År </span>}
            {d.year}
          </span>
        ))}
      </div>
    </div>
  );
}

function TipRow({ color, label, value, strong }: { color?: string; label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={clsx("flex items-center gap-1.5 whitespace-nowrap", strong ? "font-semibold text-slate-900" : "text-slate-500")}>
        {color && <span className={clsx("h-2 w-2 rounded-[2px]", color)} />}
        {label}
      </dt>
      <dd className={clsx("whitespace-nowrap font-semibold", value < 0 ? "text-rose-600" : "text-slate-900")}>
        {value < 0 ? "−" : ""}
        {dk(Math.abs(value))} kr
      </dd>
    </div>
  );
}
