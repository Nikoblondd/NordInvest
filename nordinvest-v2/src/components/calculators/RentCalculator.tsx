"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { rentPerM2 } from "@/lib/rent-estimate";
import { rentRegulationRule } from "@/lib/provenance";
import { captureEvent } from "@/lib/analytics-events";
import { clsx } from "@/lib/clsx";
import { NumberInput } from "@/components/ui/NumberInput";

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const r100 = (n: number) => Math.round(n / 100) * 100;

/** Market-rent estimate for a postnummer and an area, plus the rent rule that likely applies. */
export function RentCalculator() {
  const [zip, setZip] = useState("");
  const [area, setArea] = useState<number | null>(null);
  const [year, setYear] = useState("");
  const z = Number(zip);
  const a = area ?? 0;
  const y = Number(year);
  const valid = zip.length === 4 && z >= 1000 && z <= 9990 && a >= 10 && a <= 1000;

  const res = useMemo(() => {
    if (!valid) return null;
    const rate = rentPerM2(z);
    const mid = r100(a * rate);
    return { rate, mid, low: r100(mid * 0.9), high: r100(mid * 1.1), year: r100(mid * 12) };
  }, [valid, z, a]);
  const rule = rentRegulationRule(year.length === 4 && y > 1600 && y <= 2030 ? y : null);

  const field = "mt-1 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[16px] tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700">
          Postnummer
          <input inputMode="numeric" autoComplete="postal-code" maxLength={4} value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))} placeholder="fx 8000…" className={field} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Boligareal (m²)
          <NumberInput value={area} onValueChange={setArea} decimals={1} placeholder="fx 75…" className={field} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Byggeår <span className="font-normal text-slate-400">(valgfrit)</span>
          <input inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} placeholder="fx 1935…" className={field} />
        </label>
      </div>

      <div aria-live="polite" className="mt-6 min-h-[132px] rounded-2xl bg-slate-50 p-5">
        {res ? (
          <>
            <p className="text-sm font-medium text-slate-500">Anslået markedsleje</p>
            <p className="mt-1 text-[34px] font-semibold tabular-nums tracking-[-0.02em] text-slate-900">
              {kr(res.mid)} <span className="text-base font-medium text-slate-500">om måneden</span>
            </p>
            <p className="mt-1 text-[15px] text-slate-600">
              Typisk spænd {kr(res.low)} til {kr(res.high)} · {res.rate} kr. pr. m² · {kr(res.year)} om året
            </p>
          </>
        ) : (
          <p className="text-[15px] text-slate-500">Skriv postnummer og boligareal, så regner vi en markedsleje for området.</p>
        )}
      </div>

      <div className={clsx("mt-4 flex gap-3 rounded-2xl p-4 text-[15px] leading-relaxed", rule.level === "high" ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-blue-900")}>
        <AlertTriangle aria-hidden size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{rule.title}</p>
          <p className="mt-0.5">{rule.body}</p>
        </div>
      </div>

      <Link
        href={res ? `/analyseren?rent=${res.mid}&area=${Math.round(a)}` : "/analyseren"}
        onClick={() => captureEvent("analyze_started", { from: "rent_calculator", hasResult: !!res })}
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-blue-600 px-6 text-[15px] font-semibold text-white shadow-btn hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Regn hele investeringen igennem <ArrowRight aria-hidden size={16} />
      </Link>
      <p className="mt-2 text-[13px] text-slate-500">Med lejen på plads regner Analyseren cashflow, afkast og lån for en konkret bolig.</p>
    </div>
  );
}
