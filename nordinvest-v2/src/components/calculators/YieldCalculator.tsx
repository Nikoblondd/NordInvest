"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { captureEvent } from "@/lib/analytics-events";
import { NumberInput } from "@/components/ui/NumberInput";

const pct = (n: number) => `${n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;

/**
 * Brutto-, nettoafkast (afkastningsgrad) and kontantafkast from five inputs.
 * Same definitions as the analyser and the glossary, so the numbers agree.
 */
export function YieldCalculator() {
  const [price, setPrice] = useState<number | null>(2_000_000);
  const [rent, setRent] = useState<number | null>(10_000);
  const [costs, setCosts] = useState<number | null>(2_500);
  const [down, setDown] = useState<number | null>(20);
  const [rate, setRate] = useState<number | null>(5);

  const r = useMemo(() => {
    const P = price ?? 0, R = (rent ?? 0) * 12, C = (costs ?? 0) * 12, d = (down ?? 0) / 100, i = (rate ?? 0) / 100;
    if (P <= 0 || R <= 0) return null;
    const noi = R - C;
    const loan = P * (1 - d);
    const m = i / 12, n = 360;
    const debt = m > 0 ? (loan * m) / (1 - Math.pow(1 + m, -n)) * 12 : loan / 30;
    const equity = P * d;
    return {
      gross: (R / P) * 100,
      net: (noi / P) * 100,
      cash: equity > 0 ? ((noi - debt) / equity) * 100 : null,
      cashflow: (noi - debt) / 12,
    };
  }, [price, rent, costs, down, rate]);

  const field = "mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[16px] tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";
  const input = (label: string, v: number | null, set: (n: number | null) => void, unit: string, decimals = 0) => (
    <label className="block text-sm font-medium text-slate-700">
      {label} <span className="font-normal text-slate-400">({unit})</span>
      <NumberInput value={v} onValueChange={set} decimals={decimals} className={field} />
    </label>
  );
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {input("Købspris", price, setPrice, "kr.")}
        {input("Husleje", rent, setRent, "kr./md.")}
        {input("Faste udgifter", costs, setCosts, "kr./md.")}
        {input("Udbetaling", down, setDown, "%", 1)}
        {input("Rente", rate, setRate, "% om året", 2)}
      </div>
      <p className="mt-2 text-[13px] text-slate-500">Faste udgifter: ejerudgift, grundskyld, forsikring, fællesudgifter og vedligehold. Lånet regnes som 30-årigt annuitetslån.</p>

      <dl aria-live="polite" className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 sm:grid-cols-4">
        {[
          ["Bruttoafkast", r ? pct(r.gross) : "–"],
          ["Nettoafkast", r ? pct(r.net) : "–"],
          ["Kontantafkast", r && r.cash != null ? pct(r.cash) : "–"],
          ["Cash flow", r ? `${r.cashflow >= 0 ? "+" : "−"}${kr(Math.abs(r.cashflow))}/md.` : "–"],
        ].map(([k, v]) => (
          <div key={k} className="bg-slate-50 p-4">
            <dt className="text-[13px] font-medium text-slate-500">{k}</dt>
            <dd className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>

      <Link
        href="/analyseren"
        onClick={() => captureEvent("analyze_started", { from: "yield_calculator" })}
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-blue-600 px-6 text-[15px] font-semibold text-white shadow-btn hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Regn en rigtig bolig igennem <ArrowRight aria-hidden size={16} />
      </Link>
      <p className="mt-2 text-[13px] text-slate-500">Sæt et link ind fra en boligside, så henter Analyseren pris, areal og udgifter og tilføjer tomgang, rentestress og lejeregler.</p>
    </div>
  );
}
