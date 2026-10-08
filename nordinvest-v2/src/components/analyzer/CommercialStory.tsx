"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { monthlyPayment, type AnalysisResult } from "@/lib/analysis";
import { CLASS_YIELD, DEFAULT_YIELD } from "@/lib/deals";

/*
 * The analysis of an investeringsejendom (Ejendomstorvet), written for an
 * old-school investor: one receipt that shows the year's money in and out, a
 * plain table of what higher interest does, and what to check before bidding.
 * No charts, no ratios by their technical names.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${kr(Math.abs(n))}`;
const pct1 = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %`;

type Check = { title: string; why: string };

const COMMON: Check[] = [
  { title: "Lejekontrakterne", why: "Bed om alle kontrakter. Se hvor længe lejeren er bundet (uopsigelighed), og hvornår lejen reguleres. Afkastet i annoncen gælder kun, så længe lejen bliver betalt." },
  { title: "Lejerens økonomi", why: "Slå lejeren op på CVR og se de seneste regnskaber. En lejer med underskud kan forsvinde, og så står lokalerne tomme." },
  { title: "Hvem betaler vedligehold", why: "Står det i kontrakten, at lejeren betaler indvendigt, og du betaler tag, facade og installationer? Det kan flytte afkastet flere procent." },
  { title: "Driftsbudgettet", why: "Bed om det seneste driftsbudget og regnskab for ejendommen. Tjek skat, forsikring og administration, så tallet i annoncen holder." },
];
const BY_TYPE: Record<string, Check[]> = {
  "Lager & produktion": [{ title: "Miljø og forurening", why: "Tjek jordforurening hos regionen og om der har været værksted eller olietank. Oprydning betaler ejeren, ikke lejeren." }],
  "Detailhandel & butik": [{ title: "Beliggenhed og gadeliv", why: "En butik lever af folk, der går forbi. Se på tomme butikker i gaden og hvor længe de har stået tomme." }],
  "Kontor": [{ title: "Tomme kontorer i området", why: "Kontorlejere kan flytte, når kontrakten udløber. Se hvor mange kontorer der står til leje i byen." }],
  "Boligudlejning": [{ title: "Reglerne for huslejen", why: "Boliger bygget før 1992 har ofte reguleret husleje. Tjek at lejen må være det, annoncen siger." }],
  "Hotel & restaurant": [{ title: "Forpagterens forretning", why: "Lejen afhænger af, at stedet tjener penge. Bed om omsætningen de seneste tre år." }],
};

export function CommercialStory({
  r, rate, termYears, subcategory, onAdjust,
}: { r: AnalysisResult; rate: number; termYears: number; subcategory: string | null; onAdjust: () => void }) {
  const loanYear = r.monthlyMortgage * 12;
  const yearly = r.annualCashFlow;
  const band = (subcategory && CLASS_YIELD[subcategory]) || DEFAULT_YIELD;
  const typeName = subcategory ? subcategory.toLowerCase().replace("&", "og") : "erhvervsejendomme";
  const yieldNote = r.capRate < band.low
    ? "Det er lavt for typen. Prisen er høj i forhold til lejen."
    : r.capRate > band.high
      ? "Det er usædvanligt højt for typen. Ofte et tegn på en risiko, fx en svag lejer eller tomme lokaler."
      : r.capRate >= band.goodLo
        ? "Det er et fornuftigt niveau for typen."
        : "Det er i den lave ende for typen.";

  // What higher interest does to the monthly result, from the same loan.
  const base = Math.round(rate * 10) / 10;
  const rows = [0, 1, 2, 3].map((d) => {
    const at = base + d;
    const cf = r.cashFlow + (r.monthlyMortgage - monthlyPayment(r.loan, at, termYears));
    return { at, cf, today: d === 0 };
  });
  const checks = [...(subcategory && BY_TYPE[subcategory] ? BY_TYPE[subcategory] : []), ...COMMON];

  return (
    <section className="bg-[#f4f6f9] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto grid max-w-[1080px] gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-6">
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[28px]">Sådan hænger regnestykket sammen</h2>
            <p className="mt-1.5 text-[16px] text-slate-600">Et helt år med ejendommen, regnet ud fra det afkast, sælger oplyser.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.18)]">
            <dl className="px-5 pt-5 text-[17px]">
              <div className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-slate-700">Lejen ind <span className="text-slate-500">(efter driftsudgifter)</span></dt>
                <dd className="shrink-0 font-semibold tabular-nums text-emerald-700">{signed(r.noi)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-slate-700">Renter og afdrag på lånet</dt>
                <dd className="shrink-0 font-semibold tabular-nums text-slate-500">{signed(-loanYear)}</dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-slate-900 pt-3">
                <dt className="text-[18px] font-semibold text-slate-900">{yearly >= 0 ? "Tilbage til dig om året" : "Du mangler om året"}</dt>
                <dd className={`shrink-0 text-[20px] font-bold tabular-nums ${yearly >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(yearly)}</dd>
              </div>
              <p className="pb-5 pt-1 text-[15px] text-slate-600">Det er {kr(Math.abs(r.cashFlow))} om måneden{yearly < 0 ? ", som du selv skal lægge til" : ""}.</p>
            </dl>
            <dl className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50/70">
              <div className="min-w-0 px-5 py-4">
                <dt className="text-[14px] text-slate-500">Du lægger selv</dt>
                <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-slate-900">{kr(r.cashInvested)}</dd>
              </div>
              <div className="min-w-0 px-5 py-4">
                <dt className="text-[14px] text-slate-500">Lån</dt>
                <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-slate-900">{kr(r.loan)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-[17px] text-slate-800">
              Ejendommen giver <b className="font-semibold tabular-nums">{pct1(r.capRate)}</b> om året af prisen. For {typeName} ligger det normalt mellem {pct1(band.goodLo)} og {pct1(band.goodHi)}.
            </p>
            <p className="mt-1.5 text-[15px] text-slate-600">{yieldNote}</p>
          </div>

          <button type="button" onClick={onAdjust} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-900 hover:border-slate-400 active:translate-y-px">
            <SlidersHorizontal size={18} strokeWidth={1.8} /> Ret pris, udbetaling eller rente
          </button>
        </div>

        <div className="min-w-0 space-y-6 lg:pt-[96px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[20px] font-semibold text-slate-900">Hvad hvis renten stiger?</h3>
            <table className="mt-3 w-full text-[17px]">
              <tbody className="divide-y divide-slate-100">
                {rows.map((x) => (
                  <tr key={x.at}>
                    <td className="py-2.5 text-slate-700">{x.today ? <>Renten i dag <b className="font-semibold text-slate-900">{pct1(x.at)}</b></> : pct1(x.at)}</td>
                    <td className={`py-2.5 text-right font-semibold tabular-nums ${x.cf >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(x.cf)}/md.</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[15px] text-slate-600">
              {r.breakEvenRate > base
                ? <>Renten skal over <b className="font-semibold text-slate-900">{pct1(r.breakEvenRate)}</b>, før lejen ikke længere betaler lånet.</>
                : "Lejen betaler ikke lånet ved dagens rente. Forhandl prisen ned eller læg mere ud."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-[20px] font-semibold text-slate-900">Tjek det her, før du byder</h3>
            <p className="mt-1 text-[15px] text-slate-600">Tryk på et punkt for at se hvorfor.</p>
            <ul className="mt-3 divide-y divide-slate-100">
              {checks.map((c) => (
                <li key={c.title}>
                  <details className="group py-1">
                    <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3 text-[17px] text-slate-900 [&::-webkit-details-marker]:hidden">
                      <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
                      <span className="flex-1">{c.title}</span>
                      <ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="pb-3 pl-8 text-[15px] leading-relaxed text-slate-600">{c.why}</p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
