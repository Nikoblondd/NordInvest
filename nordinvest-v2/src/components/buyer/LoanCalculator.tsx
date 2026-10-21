"use client";

import { useMemo, useState } from "react";
import { BANK_RATE, DEBT_FACTOR, INSTITUTES, capacity, financing, yearlyBidrag } from "@/lib/buyer/finance";

/*
 * The public "Hvad kan jeg låne?" calculator: income, savings and other debt
 * give the most a household can buy for, what it costs a month, and which
 * mortgage bank charges the least bidrag on that loan.
 */
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;

function Field({ label, value, set, hint }: { label: string; value: number; set: (n: number) => void; hint?: string }) {
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <label htmlFor={id} className="block">
      <span className="text-[14px] font-medium text-slate-700">{label}</span>
      <div className="relative mt-1.5">
        <input id={id} inputMode="numeric" value={value ? value.toLocaleString("da-DK") : ""} onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")) || 0)}
          className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3.5 pr-10 text-[17px] tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="0" />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-slate-400">kr</span>
      </div>
      {hint && <span className="mt-1 block text-[13px] text-slate-500">{hint}</span>}
    </label>
  );
}

export function LoanCalculator({ rate }: { rate: number }) {
  const [income, setIncome] = useState(900_000);
  const [savings, setSavings] = useState(300_000);
  const [debt, setDebt] = useState(0);
  const cap = useMemo(() => capacity(income, savings, debt), [income, savings, debt]);
  const price = Math.floor(cap.maxPrice / 10_000) * 10_000;
  const f = useMemo(() => financing(price, { mortgageRate: rate, ownerCost: 3000 }), [price, rate]);
  const banks = INSTITUTES.map((i) => ({ ...i, yearly: yearlyBidrag(price, f.mortgage, i.bands) })).sort((a, b) => a.yearly - b.yearly);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.18)] sm:p-7">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Indkomst før skat, om året" value={income} set={setIncome} hint="Læg jeres indkomster sammen, hvis I køber to." />
        <Field label="Opsparing" value={savings} set={setSavings} />
        <Field label="Anden gæld" value={debt} set={setDebt} hint="Billån, SU-lån, forbrugslån" />
      </div>
      <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white sm:p-6">
        <p className="text-[14px] text-white/60">I kan typisk købe for op til</p>
        <p className="mt-1 text-[34px] font-semibold tabular-nums tracking-[-0.02em] sm:text-[40px]">{kr(price)}</p>
        <p className="mt-2 text-[15px] leading-relaxed text-white/75">
          {cap.limitedBy === "opsparing"
            ? `Det er opsparingen, der sætter grænsen: den skal dække 5 % i udbetaling og omkostninger. Med jeres indkomst kunne I låne til en bolig til ${kr(Math.floor(cap.byIncome / 10_000) * 10_000)}.`
            : `Det er indkomsten, der sætter grænsen: gæld over ${DEBT_FACTOR} gange indkomsten ser bankerne særligt kritisk på.`}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-[14px] sm:grid-cols-4">
          <div><dt className="text-white/55">Udbetaling (5 %)</dt><dd className="mt-0.5 font-semibold tabular-nums">{kr(f.down)}</dd></div>
          <div><dt className="text-white/55">Omkostninger</dt><dd className="mt-0.5 font-semibold tabular-nums">{kr(f.costs)}</dd></div>
          <div><dt className="text-white/55">Realkreditlån</dt><dd className="mt-0.5 font-semibold tabular-nums">{kr(f.mortgage)}</dd></div>
          <div><dt className="text-white/55">Pr. måned efter fradrag</dt><dd className="mt-0.5 font-semibold tabular-nums">{kr(f.monthlyNet)}</dd></div>
        </dl>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-slate-500">Fastforrentet realkreditlån på 80 % til {rate.toLocaleString("da-DK")} % inkl. bidrag (Nationalbanken), banklån på 15 % til {BANK_RATE.toLocaleString("da-DK")} %, ejerudgift 3.000 kr./md. og rentefradrag på ca. 33 %. Banken ser også på jeres rådighedsbeløb, så tallet er et loft, ikke et tilsagn.</p>
      {price > 0 && (
        <div className="mt-6">
          <h3 className="text-[17px] font-semibold">Bidrag på lånet hos de fire store</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {banks.map((b, i) => (
              <li key={b.name} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${i === 0 ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200"}`}>
                <span className="text-[15px] font-semibold">{b.name}{i === 0 && <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] text-white">Billigst</span>}</span>
                <span className="text-[14px] tabular-nums text-slate-700">{kr(b.yearly / 12)}/md.</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
