"use client";

import { motion, useReducedMotion } from "framer-motion";
import { clsx } from "@/lib/clsx";

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

type Step = { label: string; amount: number; kind: "in" | "out" | "result" };

/**
 * Where the rent goes, month by month: rent in, each cost taken out, and what
 * lands on your account at the end. A waterfall answers "why is cash flow
 * negative?" at a glance — the biggest bar that eats the rent is the culprit.
 */
export function CashflowWaterfall({
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
  const steps: Step[] = [
    { label: "Leje", amount: rent, kind: "in" },
    { label: "Tomgang", amount: vacancy, kind: "out" },
    { label: "Vedligehold", amount: maintenance, kind: "out" },
    { label: "Faste udgifter", amount: fixed, kind: "out" },
    { label: "Ydelse på lån", amount: mortgage, kind: "out" },
    { label: "Til dig", amount: cashFlow, kind: "result" },
  ];

  const lo = Math.min(0, cashFlow);
  const hi = Math.max(rent, 1);
  const pos = (x: number) => ((x - lo) / (hi - lo)) * 100;

  let running = rent;
  const bars = steps.map((s) => {
    if (s.kind === "in") return { ...s, from: pos(0), to: pos(rent) };
    if (s.kind === "out") {
      const from = pos(running - s.amount);
      const to = pos(running);
      running -= s.amount;
      return { ...s, from, to };
    }
    return { ...s, from: pos(Math.min(0, s.amount)), to: pos(Math.max(0, s.amount)) };
  });

  const positive = cashFlow >= 0;
  const zeroAt = pos(0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-[15px] font-medium text-slate-500">Hver måned</div>
          <div
            className={clsx(
              "mt-1 text-[44px] font-semibold leading-none tabular-nums tracking-[-0.035em] sm:text-[56px]",
              positive ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {positive ? "+" : "−"}
            {dk(Math.abs(cashFlow))}
            <span className="ml-1.5 text-2xl font-medium tracking-normal text-slate-400">kr</span>
          </div>
        </div>
        <p className="max-w-sm text-[15px] leading-relaxed text-slate-500">
          {positive
            ? "Det lander på din konto, når lejen har betalt lån og alle udgifter."
            : "Det skal du selv lægge til hver måned, fordi lejen ikke dækker lån og udgifter."}
        </p>
      </div>

      <ul
        role="img"
        className="mt-8 space-y-3"
        aria-label={`Fra leje til cash flow: ${steps.map((s) => `${s.label} ${s.kind === "out" ? "minus " : ""}${dk(Math.abs(s.amount))} kr`).join(", ")}`}
      >
        {bars.map((b, i) => (
          <li
            key={b.label}
            className={clsx(
              "grid grid-cols-[6.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_7rem] sm:gap-4",
              b.kind === "result" && "border-t border-slate-200 pt-3",
            )}
          >
            <span
              className={clsx(
                "truncate text-sm sm:text-[15px]",
                b.kind === "result" ? "font-semibold text-slate-900" : "text-slate-600",
              )}
            >
              {b.label}
            </span>
            <div className="relative h-6">
              {lo < 0 && (
                <div
                  className="absolute -inset-y-1.5 z-10 border-l border-dashed border-slate-300"
                  style={{ left: `${zeroAt}%` }}
                />
              )}
              <motion.div
                className={clsx(
                  "absolute inset-y-0 origin-left rounded-md",
                  b.kind === "in" && "bg-emerald-500",
                  b.kind === "out" && "bg-rose-200",
                  b.kind === "result" && (positive ? "bg-emerald-600" : "bg-rose-500"),
                )}
                style={{ left: `${b.from}%`, width: `${Math.max(0.8, b.to - b.from)}%` }}
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: reduce ? 0 : i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span
              className={clsx(
                "whitespace-nowrap text-right text-sm font-semibold tabular-nums sm:text-[15px]",
                b.kind === "in" && "text-emerald-700",
                b.kind === "out" && "text-slate-700",
                b.kind === "result" && (positive ? "text-emerald-700" : "text-rose-700"),
              )}
            >
              {b.kind === "out" ? "−" : b.kind === "result" && !positive ? "−" : "+"}
              {dk(Math.abs(b.amount))}&nbsp;kr
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
