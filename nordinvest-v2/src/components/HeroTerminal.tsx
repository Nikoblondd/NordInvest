"use client";

import { useMemo, useState } from "react";
import { analyze, krMd, pct } from "@/lib/analysis";
import { clsx } from "@/lib/clsx";

export function HeroTerminal() {
  const [price, setPrice] = useState(3_200_000);
  const [rent, setRent] = useState(21_500);

  const r = useMemo(
    () =>
      analyze({
        price,
        monthlyRent: rent,
        downPaymentPct: 20,
        interestRate: 5.0,
        monthlyExpenses: 3_000,
      }),
    [price, rent],
  );

  const tone =
    r.score >= 65 ? "text-data-pos" : r.score >= 45 ? "text-data-warn" : "text-data-neg";

  return (
    <div className="border border-white/12 bg-navy-800/50 backdrop-blur">
      {/* terminal top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream-100/50">
          Live analyse
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-data-pos" />
          <span className="font-mono text-[11px] text-cream-100/40">nordinvest</span>
        </span>
      </div>

      <div className="p-5">
        {/* inputs */}
        <div className="grid grid-cols-2 gap-3">
          <TermInput label="Pris" value={price} onChange={setPrice} step={50000} />
          <TermInput label="Leje / md." value={rent} onChange={setRent} step={500} />
        </div>

        {/* score */}
        <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-5">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cream-100/40">
              Score
            </div>
            <div className={clsx("font-mono text-7xl font-light leading-none tnum", tone)}>
              {r.score}
              <span className="text-2xl text-cream-100/25">/100</span>
            </div>
          </div>
          <div className="pb-1 text-right">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-400">
              {r.rating}
            </div>
          </div>
        </div>

        <p className="mt-4 font-serif text-base italic leading-snug text-cream-100/90">
          {r.verdict}
        </p>

        {/* mini metrics */}
        <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden border border-white/10 bg-white/10">
          {[
            { l: "Afkast", v: pct(r.grossYield, 1) },
            { l: "Cash flow", v: krMd(r.cashFlow).replace(" kr/md.", "") },
            { l: "Udbetaling", v: (r.downPayment / 1000).toFixed(0) + "k" },
          ].map((m) => (
            <div key={m.l} className="bg-navy-900 px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-wide text-cream-100/40">
                {m.l}
              </div>
              <div className="mt-0.5 font-mono text-sm text-cream-100 tnum">{m.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TermInput({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-100/40">
        {label}
      </span>
      <div className="mt-1 flex items-center border border-white/15 bg-navy-900/60 focus-within:border-gold-400/60">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent px-2.5 py-2 font-mono text-sm text-cream-100 tnum outline-none"
        />
        <span className="pr-2 font-mono text-[10px] text-cream-100/30">kr</span>
      </div>
    </label>
  );
}
