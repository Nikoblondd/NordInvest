"use client";

import { useState } from "react";
import { pct, kr } from "@/lib/analysis";
import { clsx } from "@/lib/clsx";

export function BruttoafkastCalc() {
  const [price, setPrice] = useState(3_200_000);
  const [rent, setRent] = useState(18_000);

  const annualRent = rent * 12;
  const yield_ = price > 0 ? (annualRent / price) * 100 : 0;

  const band =
    yield_ >= 7
      ? { label: "Stærkt afkast", tone: "text-data-pos" }
      : yield_ >= 5
        ? { label: "Solidt afkast", tone: "text-data-warn" }
        : { label: "Lavt afkast", tone: "text-data-neg" };

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6">
        <ToolField label="Købspris" value={price} onChange={setPrice} suffix="kr" step={25000} />
        <ToolField label="Månedlig leje" value={rent} onChange={setRent} suffix="kr/md." step={500} />
        <p className="text-sm text-stone-500">
          Årlig leje: <span className="font-mono">{kr(annualRent)}</span>
        </p>
      </div>
      <div className="flex flex-col justify-center rounded-2xl border border-stone-200 bg-cream-50 p-8 text-center">
        <div className="micro text-gold-600">Bruttoafkast</div>
        <div className={clsx("mt-2 font-mono text-6xl font-light tnum", band.tone)}>
          {pct(yield_)}
        </div>
        <div className="mt-2 text-stone-600">{band.label}</div>
        <p className="mt-4 text-xs text-stone-400">
          Bruttoafkast før drift og finansiering. Vil du se cash flow og nettoafkast,
          så brug Analyseren.
        </p>
      </div>
    </div>
  );
}

export function ToolField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix: string;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm text-stone-600">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-stone-200 bg-white focus-within:border-navy-900">
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg bg-transparent px-3 py-2.5 font-mono text-stone-900 tnum outline-none"
        />
        <span className="px-3 text-sm text-stone-400">{suffix}</span>
      </div>
    </label>
  );
}
