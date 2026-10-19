"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { analyze } from "@/lib/analysis";
import { useTween } from "./motion";

/*
 * The free test on the public page: three numbers in, the core result out,
 * computed with the same engine as the full analysis. What only members get
 * is listed underneath, so the visitor sees what the rest of the system adds.
 */

const fmt = (n: number) => Math.round(n).toLocaleString("da-DK");
const parse = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

function Field({ id, label, value, onChange, suffix, typing, onFocus }: { id: string; label: string; value: string; onChange: (v: string) => void; suffix: string; typing?: boolean; onFocus?: () => void }) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium text-slate-600">{label}</label>
      <div className={`mt-1 flex h-11 items-center rounded-lg border bg-white px-3 transition-shadow focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 ${typing ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-300"}`}>
        <input id={id} inputMode="numeric" value={value} onFocus={onFocus} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold tabular-nums text-slate-900 outline-none" />
        {typing && <span aria-hidden className="mr-1 h-5 w-[2px] animate-pulse bg-blue-600" />}
        <span className="text-[14px] text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}

const DEF = { price: "1.295.000", rent: "8.500", opex: "1.900" };

/**
 * With `autoplay`, the card fills itself in the first time it scrolls into
 * view, as if someone typed the numbers, and the result is worked out live.
 * Touching a field stops the demo and hands over to the visitor.
 */
export function QuickTest({ autoplay = false }: { autoplay?: boolean }) {
  const [price, setPrice] = useState(autoplay ? "" : DEF.price);
  const [rent_, setRent] = useState(autoplay ? "" : DEF.rent);
  const [opex, setOpex] = useState(autoplay ? "" : DEF.opex);
  const [typing, setTyping] = useState<"price" | "rent" | "opex" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const stop = useRef(false);

  useEffect(() => {
    if (!autoplay) return;
    const fill = () => { setPrice(DEF.price); setRent(DEF.rent); setOpex(DEF.opex); setTyping(null); };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { fill(); return; }
    const timers: number[] = [];
    const run = () => {
      const seq: [typeof typing, string, (v: string) => void][] = [["price", DEF.price, setPrice], ["rent", DEF.rent, setRent], ["opex", DEF.opex, setOpex]];
      let t = 250;
      for (const [k, val, set] of seq) {
        timers.push(window.setTimeout(() => !stop.current && setTyping(k), t));
        for (let i = 1; i <= val.length; i++) { t += 55; timers.push(window.setTimeout(() => !stop.current && set(val.slice(0, i)), t)); }
        t += 260;
      }
      timers.push(window.setTimeout(() => !stop.current && setTyping(null), t));
    };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.45 });
    if (root.current) io.observe(root.current);
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, [autoplay]);
  // The visitor takes over: finish the numbers at once and stop typing.
  const takeOver = () => {
    if (stop.current || !autoplay) return;
    stop.current = true;
    setTyping(null);
    setPrice(DEF.price); setRent(DEF.rent); setOpex(DEF.opex);
  };

  const r = useMemo(() => {
    const p = parse(price);
    const m = parse(rent_);
    if (p < 100000 || m < 500) return null;
    return analyze({ price: p, monthlyRent: m, monthlyOpex: parse(opex), downPaymentPct: 20, interestRate: 4.5 });
  }, [price, rent_, opex]);

  const good = r && r.cashFlow >= 0;
  const cf = useTween(r?.cashFlow ?? 0);
  return (
    <div ref={root} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-30px_rgba(11,27,51,0.35)] sm:p-6">
      <p className="pr-12 text-[18px] font-semibold tracking-[-0.01em] text-slate-900">Hvad giver boligen om måneden?</p>
      <p className="mt-0.5 text-[14px] text-slate-500">Med 20 % udbetaling og 4,5 % rente.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field id="qt-price" label="Udbudspris" value={price} onChange={setPrice} suffix="kr." typing={typing === "price"} onFocus={takeOver} />
        <Field id="qt-rent" label="Husleje" value={rent_} onChange={setRent} suffix="kr./md." typing={typing === "rent"} onFocus={takeOver} />
        <Field id="qt-opex" label="Ejerudgift" value={opex} onChange={setOpex} suffix="kr./md." typing={typing === "opex"} onFocus={takeOver} />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4" aria-live="polite">
        {r && !typing ? (
          <>
            <p className="text-[13px] text-slate-500">Overskud efter lån og udgifter</p>
            <p className={`text-[36px] font-semibold leading-tight tabular-nums tracking-[-0.03em] ${good ? "text-emerald-700" : "text-rose-600"}`}>
              {cf >= 0 ? "+" : "-"}{fmt(Math.abs(cf))} kr./md.
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
                    {parts.map((p) => p.v > 0 && <span key={p.l} className={`${p.c} transition-[width] duration-500 ease-out`} style={{ width: `${(p.v / total) * 100}%` }} />)}
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
          typing || (autoplay && !price)
            ? <div className="space-y-3" aria-label="Regner"><p className="text-[13px] text-slate-500">Overskud efter lån og udgifter</p><div className="h-10 w-56 animate-pulse rounded-lg bg-slate-100" /><div className="h-3 w-full animate-pulse rounded-full bg-slate-100" /><div className="grid grid-cols-2 gap-3"><div className="h-[72px] animate-pulse rounded-lg bg-slate-50" /><div className="h-[72px] animate-pulse rounded-lg bg-slate-50" /></div></div>
            : <p className="text-[14px] text-slate-500">Skriv pris og husleje for at se resultatet.</p>
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
      <Link href="/adgang" className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#17213a] px-4 text-[15px] font-semibold text-white hover:bg-[#13284a]">
        Anmod om adgang
      </Link>
    </div>
  );
}
