"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { clsx } from "@/lib/clsx";

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

type Part = { id: string; label: string; amount: number; bar: string; ink: string; explain: string };

/**
 * Where the rent goes. One bar is the rent; each slice is what eats it (blue is
 * financing, greys are running costs) and the green end is what is left for the
 * owner. Tap a slice or its row for what it covers. Month or year with one
 * switch. Design drawn with an image model (Higgsfield), rebuilt with live data.
 */
export function MoneyFlow({
  rent,
  vacancy,
  maintenance,
  fixed,
  mortgage,
  cashFlow,
}: {
  rent: number;
  vacancy: number;
  maintenance: number;
  fixed: number;
  mortgage: number;
  cashFlow: number;
}) {
  const reduce = useReducedMotion();
  // Watch the unscaled wrapper: a bar at scaleX(0) has no width, so it would
  // never count as on screen and the reveal would never start.
  const barRef = useRef<HTMLDivElement>(null);
  const seen = useInView(barRef, { once: true, margin: "-40px 0px" });
  const [yearly, setYearly] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const k = yearly ? 12 : 1;
  const positive = cashFlow >= 0;

  const all: Part[] = [
    { id: "laan", label: "Lån", amount: mortgage, bar: "bg-blue-600", ink: "text-white", explain: "Renter og afdrag. Afdraget øger friværdien og er dermed opsparing." },
    { id: "faste", label: "Faste udgifter", amount: fixed, bar: "bg-[#93b4f5]", ink: "text-slate-900", explain: "Ejendomsskat, forsikring, fællesudgifter og øvrige faste udgifter." },
    { id: "vedl", label: "Vedligehold", amount: maintenance, bar: "bg-slate-400", ink: "text-white", explain: "Hensættelse til reparationer og udskiftning, fx maling, hvidevarer, tag og vinduer." },
    { id: "tomgang", label: "Tomgang", amount: vacancy, bar: "bg-slate-300", ink: "text-slate-900", explain: "Forventet lejetab mellem to lejemål, fordelt over året." },
  ];
  // A zero post (no ejerudgift entered, say) would only print "−0 kr".
  const parts = all.filter((p) => Math.round(p.amount) > 0);
  if (positive) {
    parts.push({ id: "dig", label: "Cash flow", amount: cashFlow, bar: "bg-emerald-500", ink: "text-white", explain: "Lejeindtægt efter ydelse på lån og driftsudgifter." });
  }
  const costs = mortgage + fixed + maintenance + vacancy;
  const scale = Math.max(rent, costs, 1);
  const rentAt = (rent / scale) * 100;
  const pickedPart = parts.find((p) => p.id === picked) ?? null;

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[15px] font-medium text-slate-500">{yearly ? "Pr. år" : "Pr. måned"}</div>
          <div
            className={clsx(
              "mt-1 whitespace-nowrap text-[44px] font-semibold leading-none tabular-nums tracking-[-0.035em] sm:text-[56px]",
              positive ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {positive ? "+" : "−"}
            {dk(Math.abs(cashFlow * k))}
            <span className="ml-1.5 text-2xl font-medium tracking-normal text-slate-400">kr</span>
          </div>
        </div>
        <div role="radiogroup" aria-label="Periode" className="grid shrink-0 grid-cols-2 rounded-full bg-slate-100 p-1 text-[14px] font-semibold">
          {[false, true].map((y) => (
            <button
              key={String(y)}
              type="button"
              role="radio"
              aria-checked={yearly === y}
              onClick={() => setYearly(y)}
              className={clsx(
                "min-h-9 rounded-full px-3.5 transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                yearly === y ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.15)]" : "text-slate-500 hover:text-slate-900",
              )}
            >
              {y ? "År" : "Måned"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500">
        {positive
          ? "Cash flow efter ydelse på lån og driftsudgifter."
          : `Lejen dækker ikke lån og udgifter. Underskuddet er ${dk(Math.abs(cashFlow * k))} kr. ${yearly ? "pr. år" : "pr. måned"}.`}
      </p>

      {/* The bar: the rent, sliced by where it goes. */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between text-[14px]">
          <span className="font-semibold text-slate-900">Leje {dk(rent * k)} kr</span>
          {!positive && <span className="font-semibold text-rose-600">Udgifter {dk(costs * k)} kr</span>}
        </div>
        <div ref={barRef} className="relative mt-2">
          <motion.div
            className="flex h-11 origin-left overflow-hidden rounded-xl"
            initial={reduce ? false : { scaleX: 0 }}
            animate={seen || reduce ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {parts.map((p) => {
              const w = (p.amount / scale) * 100;
              if (w <= 0) return null;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`${p.label}: ${dk(p.amount * k)} kr`}
                  aria-pressed={picked === p.id}
                  onClick={() => setPicked(picked === p.id ? null : p.id)}
                  style={{ width: `${w}%` }}
                  className={clsx(
                    "relative h-full min-w-[3px] border-r-2 border-white text-[13px] font-semibold tabular-nums transition-opacity last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900",
                    p.bar,
                    p.ink,
                    picked && picked !== p.id && "opacity-35",
                  )}
                >
                  {w > 13 && <span className="px-1">{dk(p.amount * k)}</span>}
                </button>
              );
            })}
          </motion.div>
          {!positive && (
            <div aria-hidden className="pointer-events-none absolute -inset-y-2 border-l-2 border-dashed border-rose-500" style={{ left: `${rentAt}%` }}>
              <span className="absolute -bottom-6 -translate-x-1/2 whitespace-nowrap text-[12px] font-semibold text-rose-600">Lejeindtægt</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend rows double as the tap targets on a phone. */}
      <ul className={clsx("grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-5", positive ? "mt-5" : "mt-10")}>
        {parts.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={picked === p.id}
              onClick={() => setPicked(picked === p.id ? null : p.id)}
              className={clsx(
                "flex w-full min-h-11 items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                picked === p.id ? "bg-slate-100" : "hover:bg-slate-50",
              )}
            >
              <span aria-hidden className={clsx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", p.bar)} />
              <span className="min-w-0">
                <span className="block truncate text-[14px] text-slate-600">{p.label}</span>
                <span className="block text-[15px] font-semibold tabular-nums text-slate-900">
                  {p.id === "dig" ? "+" : "−"}{dk(p.amount * k)} kr
                  <span className="ml-1 text-[12px] font-medium text-slate-400">{Math.round((p.amount / Math.max(rent, 1)) * 100)} %</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div aria-live="polite">
        {pickedPart ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-[15px] leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-200/70">
            <span className="font-semibold text-slate-900">{pickedPart.label}. </span>
            {pickedPart.explain}
          </p>
        ) : (
          <p className="mt-4 px-2 text-[13px] text-slate-400">Klik på en post for en forklaring.</p>
        )}
      </div>
    </div>
  );
}
