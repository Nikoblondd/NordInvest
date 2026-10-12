"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

/*
 * "Anmod om adgang": what Nikolaj needs to call back, judge the fit and agree
 * a price. Short on purpose; everything else is taken in the conversation.
 * DRAFT: the submit is not wired to anything yet.
 */

const PORTFOLIO = ["Ingen endnu", "1-2", "3-10", "Over 10"];
const GOALS = ["Udlejningsbolig", "Renovering og salg", "Erhverv", "Andet"];

export function AccessForm() {
  const [sent, setSent] = useState(false);
  const [portfolio, setPortfolio] = useState("");
  const [goals, setGoals] = useState<string[]>([]);

  if (sent) {
    return (
      <div className="rounded-2xl bg-white p-6 text-slate-900">
        <CheckCircle2 className="text-emerald-600" size={28} />
        <p className="mt-3 text-[20px] font-semibold">Tak. Jeg ringer dig op inden for en arbejdsdag.</p>
        <p className="mt-1.5 text-[15px] text-slate-600">Har du en bolig, du vil have gennemgået, så tager vi den med på samtalen. Nikolaj</p>
      </div>
    );
  }

  const input = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";
  const chip = (on: boolean) => `min-h-[40px] rounded-lg border px-3 text-[14px] font-medium ${on ? "border-[#0b1b33] bg-[#0b1b33] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`;

  return (
    <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="rounded-2xl bg-white p-5 text-slate-900 sm:p-6">
      <p className="text-[18px] font-semibold">Anmod om adgang</p>
      <p className="mt-0.5 text-[14px] text-slate-500">Tager 2 minutter. Jeg vender selv tilbage.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="af-name" className="text-[13px] font-medium text-slate-600">Navn</label><input id="af-name" required autoComplete="name" className={input} /></div>
        <div><label htmlFor="af-mail" className="text-[13px] font-medium text-slate-600">E-mail</label><input id="af-mail" type="email" required autoComplete="email" className={input} /></div>
        <div><label htmlFor="af-tel" className="text-[13px] font-medium text-slate-600">Telefon</label><input id="af-tel" type="tel" required autoComplete="tel" className={input} /></div>
      </div>

      <fieldset className="mt-4">
        <legend className="text-[13px] font-medium text-slate-600">Hvor mange udlejningsejendomme ejer du i dag?</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PORTFOLIO.map((p) => <button key={p} type="button" aria-pressed={portfolio === p} onClick={() => setPortfolio(p)} className={chip(portfolio === p)}>{p}</button>)}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-[13px] font-medium text-slate-600">Hvad kigger du efter?</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {GOALS.map((g) => { const on = goals.includes(g); return <button key={g} type="button" aria-pressed={on} onClick={() => setGoals(on ? goals.filter((x) => x !== g) : [...goals, g])} className={chip(on)}>{g}</button>; })}
        </div>
      </fieldset>

      <div className="mt-4"><label htmlFor="af-link" className="text-[13px] font-medium text-slate-600">En bolig, vi skal kigge på sammen <span className="text-slate-400">(valgfrit)</span></label><input id="af-link" placeholder="Link fra Boligsiden, Home, EDC m.fl." className={input} /></div>
      <div className="mt-4"><label htmlFor="af-msg" className="text-[13px] font-medium text-slate-600">Hvad skal NordInvest hjælpe dig med? <span className="text-slate-400">(valgfrit)</span></label><textarea id="af-msg" rows={3} className={`${input} h-auto py-2`} /></div>

      <button type="submit" className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white hover:bg-blue-500 active:translate-y-px">Send anmodning</button>
      <p className="mt-2.5 text-[12px] leading-relaxed text-slate-500">Vi bruger kun oplysningerne til at kontakte dig om adgang. En anmodning giver ikke adgang i sig selv, og den forpligter dig ikke.</p>
    </form>
  );
}
