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
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-slate-500">Hver måned</div>
          <div
            className={clsx(
              "font-display text-4xl font-bold tabular-nums tracking-[-0.03em] sm:text-5xl",
              positive ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {positive ? "+" : "−"}
            {dk(Math.abs(cashFlow))} <span className="text-2xl font-semibold text-slate-400">kr</span>
          </div>
        </div>
        <p className="max-w-xs text-sm text-slate-500">
          {positive
            ? "Det lander på din konto, når lejen har betalt lån og alle udgifter."
            : "Det skal du selv lægge til hver måned, fordi lejen ikke dækker lån og udgifter."}
        </p>
      </div>

      <div className="mt-6 space-y-2.5">
        {bars.map((b, i) => (
          <div
            key={b.label}
            className="grid grid-cols-[6.75rem_minmax(0,1fr)_5.25rem] items-center gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)_6.5rem] sm:gap-3"
          >
            <span
              className={clsx(
                "truncate text-[13px] sm:text-sm",
                b.kind === "result" ? "font-semibold text-slate-900" : "text-slate-600",
              )}
            >
              {b.kind === "out" ? "− " : b.kind === "result" ? "= " : ""}
              {b.label}
            </span>
            <div className="relative h-7 rounded-lg bg-slate-100/80">
              {lo < 0 && (
                <div
                  aria-hidden
                  className="absolute -inset-y-1 z-10 border-l border-dashed border-slate-400"
                  style={{ left: `${zeroAt}%` }}
                />
              )}
              <motion.div
                className={clsx(
                  "absolute inset-y-0 rounded-lg",
                  b.kind === "in" && "bg-emerald-500",
                  b.kind === "out" && "bg-rose-300",
                  b.kind === "result" && (positive ? "bg-emerald-600" : "bg-rose-600"),
                )}
                style={{ left: `${b.from}%` }}
                initial={reduce ? false : { width: 0 }}
                whileInView={{ width: `${Math.max(0.8, b.to - b.from)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: reduce ? 0 : i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
              />
            </div>
            <span
              className={clsx(
                "whitespace-nowrap text-right font-display text-sm font-semibold tabular-nums sm:text-[15px]",
                b.kind === "in" && "text-emerald-700",
                b.kind === "out" && "text-slate-700",
                b.kind === "result" && (positive ? "text-emerald-700" : "text-rose-700"),
              )}
            >
              {b.kind === "out" ? "−" : b.kind === "result" && !positive ? "−" : ""}
              {dk(Math.abs(b.amount))} kr
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
