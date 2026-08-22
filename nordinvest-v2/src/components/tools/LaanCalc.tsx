"use client";

import { useState } from "react";
import { monthlyPayment, kr, krMd } from "@/lib/analysis";
import { ToolField } from "./BruttoafkastCalc";

export function LaanCalc() {
  const [loan, setLoan] = useState(2_560_000);
  const [rate, setRate] = useState(5.0);
  const [years, setYears] = useState(30);

  const m = monthlyPayment(loan, rate, years);
  const totalPaid = m * years * 12;
  const totalInterest = totalPaid - loan;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        <ToolField label="Lånebeløb" value={loan} onChange={setLoan} suffix="kr" step={25000} />
        <ToolField label="Rente" value={rate} onChange={setRate} suffix="% p.a." step={0.25} />
        <ToolField label="Løbetid" value={years} onChange={setYears} suffix="år" />
      </div>
      <div className="flex flex-col justify-center rounded-2xl border border-stone-200 bg-cream-50 p-8">
        <div className="text-center">
          <div className="micro text-gold-600">Månedlig ydelse</div>
          <div className="mt-2 font-mono text-5xl font-light tnum text-navy-900">
            {krMd(m)}
          </div>
        </div>
        <dl className="mt-6 space-y-2 border-t border-stone-200 pt-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">Samlet tilbagebetaling</dt>
            <dd className="font-mono tnum">{kr(totalPaid)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Heraf renter</dt>
            <dd className="font-mono tnum text-data-neg">{kr(totalInterest)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-stone-400">
          Annuitetslån med fast ydelse. Bidragssats og gebyrer er ikke medregnet.
        </p>
      </div>
    </div>
  );
}
