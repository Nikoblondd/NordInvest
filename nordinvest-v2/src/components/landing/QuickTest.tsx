"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { analyze } from "@/lib/analysis";

/*
 * The free test on the public page: three numbers in, the core result out,
 * computed with the same engine as the full analysis. What only members get
 * is listed underneath, so the visitor sees what the rest of the system adds.
 */

const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");
const parse = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

function Field({ id, label, value, onChange, suffix }: { id: string; label: string; value: string; onChange: (v: string) => void; suffix: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium text-slate-600">{label}</label>
      <div className="mt-1 flex h-11 items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
        <input id={id} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold tabular-nums text-slate-900 outline-none" />
        <span className="text-[14px] text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}

export function QuickTest() {
  const [price, setPrice] = useState("1.295.000");
  const [rent_, setRent] = useState("8.500");
  const [opex, setOpex] = useState("1.900");

  const r = useMemo(() => {
    const p = parse(price);
    const m = parse(rent_);
    if (p < 100000 || m < 500) return null;
    return analyze({ price: p, monthlyRent: m, monthlyOpex: parse(opex), downPaymentPct: 20, interestRate: 4.5 });
  }, [price, rent_, opex]);

  const good = r && r.cashFlow >= 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-30px_rgba(11,27,51,0.35)] sm:p-6">
      <p className="pr-12 text-[18px] font-semibold tracking-[-0.01em] text-slate-900">Hvad giver boligen om måneden?</p>
      <p className="mt-0.5 text-[14px] text-slate-500">Med 20 % udbetaling og 4,5 % rente.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field id="qt-price" label="Udbudspris" value={price} onChange={setPrice} suffix="kr." />
        <Field id="qt-rent" label="Husleje" value={rent_} onChange={setRent} suffix="kr./md." />
        <Field id="qt-opex" label="Ejerudgift" value={opex} onChange={setOpex} suffix="kr./md." />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4" aria-live="polite">
        {r ? (
          <>
            <p className="text-[13px] text-slate-500">Overskud efter lån og udgifter</p>
            <p className={`text-[36px] font-semibold leading-tight tabular-nums tracking-[-0.03em] ${good ? "text-emerald-700" : "text-rose-600"}`}>
              {r.cashFlow >= 0 ? "+" : "-"}{fmt(Math.abs(r.cashFlow))} kr./md.
            </p>
            {(() => {
              const rent = parse(rent_);
              const loan = r.monthlyMortgage;
              const costs = Math.max(0, rent - loan - r.cashFlow);
              const total = Math.max(rent, loan + costs);
              const parts = [
                { l: "Lån", v: loan, c: "bg-slate-700" },
                { l: "Udgifter", v: costs, c: "bg-slate-300" },
                { l: "Overskud", v: Math.max(0, r.cashFlow), c: "bg-emerald-500" },
              ];
              return (
                <div className="mt-3">
                  <p className="text-[12px] text-slate-500">Sådan bliver huslejen på {fmt(rent)} kr. brugt</p>
                  <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-slate-100">
                    {parts.map((p) => p.v > 0 && <span key={p.l} className={p.c} style={{ width: `${(p.v / total) * 100}%` }} />)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-600">
                    {parts.map((p) => <span key={p.l} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-sm ${p.c}`} />{p.l} {fmt(p.v)} kr.</span>)}
                  </div>
                </div>
              );
            })()}
            <div className="mt-4 grid grid-cols-2 gap-3 text-[14px]">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Afkast af prisen</p><p className="text-[18px] font-semibold tabular-nums text-slate-900">{r.capRate.toFixed(1).replace(".", ",")} %</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-slate-500">Højeste rente, lejen kan bære</p><p className="text-[18px] font-semibold tabular-nums text-slate-900">{r.breakEvenRate > 0 ? `${r.breakEvenRate.toFixed(1).replace(".", ",")} %` : "Holder ikke"}</p></div>
            </div>
          </>
        ) : (
          <p className="text-[14px] text-slate-500">Skriv pris og husleje for at se resultatet.</p>
        )}
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-[13px] font-semibold text-slate-700">Med adgang regner NordInvest også på</p>
        <ul className="mt-2 grid gap-1.5 text-[14px] text-slate-600 sm:grid-cols-2">
          {["Solgte priser i området", "BBR, skatter og fremtidige byrder", "Salgsopstilling og referater", "Renten, hvis den stiger", "10 år frem med salg", "Dit højeste bud"].map((t) => (
            <li key={t} className="flex items-center gap-2"><Lock size={13} className="shrink-0 text-slate-400" /> {t}</li>
          ))}
        </ul>
      </div>
      <Link href="/adgang" className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#0b1b33] px-4 text-[15px] font-semibold text-white hover:bg-[#13284a]">
        Anmod om adgang
      </Link>
    </div>
  );
}
