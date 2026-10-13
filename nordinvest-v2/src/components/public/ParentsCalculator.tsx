"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { analyze } from "@/lib/analysis";
import { parentsView } from "@/lib/parents";
import { NumberInput } from "@/components/ui/NumberInput";

/*
 * Forældrekøb, regnet med NordInvests egen model: the family buys, the child
 * pays rent, the flat is sold after the studies. Shows the month, the result
 * after the sale and the tax on the gain, and how it compares with renting.
 * Running income tax depends on the chosen tax scheme and is left out.
 */

const kr = (n: number) => `${n < 0 ? "-" : ""}${Math.abs(Math.round(n)).toLocaleString("da-DK")} kr.`;

export function ParentsCalculator() {
  const [price, setPrice] = useState<number | null>(1900000);
  const [rent, setRent] = useState<number | null>(6500);
  const [opex, setOpex] = useState<number | null>(2200);
  const [down, setDown] = useState<number | null>(20);
  const [rate, setRate] = useState<number | null>(4.5);
  const [years, setYears] = useState<number | null>(5);
  const [growth, setGrowth] = useState<number | null>(2);

  const out = useMemo(() => {
    if (!price || !rent || price < 100000) return null;
    const inputs = { price, monthlyRent: rent, monthlyOpex: opex ?? 0, downPaymentPct: down ?? 20, interestRate: rate ?? 4.5, holdYears: Math.max(1, Math.min(15, years ?? 5)), appreciationPct: growth ?? 2, vacancyPct: 0, maintenancePct: 5 };
    const r = analyze(inputs);
    return { r, pv: parentsView(inputs, r) };
  }, [price, rent, opex, down, rate, years, growth]);

  const field = (id: string, label: string, v: number | null, set: (n: number | null) => void, unit: string, decimals = 0) => (
    <div>
      <label htmlFor={id} className="text-[14px] font-medium text-slate-700">{label}</label>
      <div className="mt-1.5 flex h-12 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
        <NumberInput id={id} value={v} decimals={decimals} onValueChange={set} className="w-full min-w-0 bg-transparent text-[16px] font-semibold tabular-nums outline-none" />
        <span className="shrink-0 text-[13px] text-slate-500">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">{field("fk-price", "Købspris", price, setPrice, "kr.")}</div>
        {field("fk-rent", "Husleje fra barnet", rent, setRent, "kr./md.")}
        {field("fk-opex", "Ejerudgift", opex, setOpex, "kr./md.")}
        {field("fk-down", "Udbetaling", down, setDown, "%", 1)}
        {field("fk-rate", "Rente", rate, setRate, "%", 2)}
        {field("fk-years", "Ejertid", years, setYears, "år")}
        {field("fk-growth", "Prisstigning", growth, setGrowth, "% om året", 1)}
      </div>
      <div aria-live="polite" className="rounded-xl bg-slate-50 p-5">
        {!out ? <p className="text-[15px] text-slate-500">Skriv købspris og husleje.</p> : (
          <>
            <p className="text-[14px] font-medium text-slate-500">Hver måned</p>
            <p className={`text-[30px] font-semibold tabular-nums tracking-[-0.02em] ${out.r.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{kr(out.r.cashFlow)}</p>
            <p className="text-[14px] text-slate-600">Husleje minus ydelse på {kr(out.r.monthlyMortgage)}, ejerudgift og vedligehold.</p>
            <dl className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-[15px]">
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Familien lægger selv</dt><dd className="font-semibold tabular-nums">{kr(out.r.cashInvested)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Forventet salgspris om {out.pv.years} år</dt><dd className="font-semibold tabular-nums">{kr(out.r.saleValue)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Skat af gevinsten ved salg</dt><dd className="font-semibold tabular-nums">{kr(out.pv.tax)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Resultat efter salg og skat</dt><dd className={`font-semibold tabular-nums ${out.pv.afterTax >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{kr(out.pv.afterTax)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-600">Husleje til en udlejer i samme periode</dt><dd className="font-semibold tabular-nums">{kr(-out.pv.familyRent)}</dd></div>
            </dl>
            <p className={`mt-4 rounded-lg px-3 py-2.5 text-[15px] font-semibold ${out.pv.vsRenting >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
              Forældrekøbet er {kr(Math.abs(out.pv.vsRenting))} {out.pv.vsRenting >= 0 ? "bedre" : "dyrere"} end at leje.
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-500">Regnet med NordInvests model: 30-årigt annuitetslån, købsomkostninger, salgsomkostninger med mægler og rapporter og ejendomsavanceskat med 10.000 kr. i tillæg pr. ejerår. Skat af den løbende lejeindtægt afhænger af jeres skatteordning og er ikke med. <Link href="/adgang" className="font-medium text-blue-700 hover:underline">Den fulde analyse</Link> regner på den konkrete bolig.</p>
          </>
        )}
      </div>
    </div>
  );
}
