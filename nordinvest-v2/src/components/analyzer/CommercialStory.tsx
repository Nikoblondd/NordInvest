"use client";

import type { ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { WealthChart } from "@/components/analyzer/story/WealthChart";
import { FutureBurdens } from "@/components/analyzer/FutureBurdens";
import { monthlyPayment, type AnalysisResult } from "@/lib/analysis";
import { CLASS_YIELD, DEFAULT_YIELD } from "@/lib/deals";

/*
 * The analysis of an investeringsejendom (Ejendomstorvet), written for an
 * old-school investor: one receipt that shows the year's money in and out, a
 * plain table of what higher interest does, ten years in three building blocks,
 * what to check before bidding and where the numbers come from. Every section
 * is open; no ratio is called by its technical name.
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

const mio = (n: number) => `${(n / 1e6).toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mio. kr.`;

/** One open section: the question, a one-line answer in its colour, then the evidence. */
function Part({ id, tint, q, a, tone, children }: { id: string; tint?: boolean; q: string; a: string; tone: "good" | "warn" | "bad" | "neutral"; children: ReactNode }) {
  const col = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-rose-600" : "text-slate-600";
  return (
    <section id={id} className={`scroll-mt-24 border-t border-slate-200/70 px-4 py-10 sm:px-6 sm:py-14 ${tint ? "bg-[#f4f6f9]" : "bg-white"}`}>
      <div className="mx-auto max-w-[1080px]">
        <h2 className="text-[26px] font-semibold leading-[1.12] tracking-[-0.02em] text-slate-900 [text-wrap:balance] sm:text-[32px]">{q}</h2>
        <p className={`mt-2 text-[18px] font-medium leading-snug ${col}`}>{a}</p>
        <div className="mt-7">{children}</div>
      </div>
    </section>
  );
}

const card = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.18)]";

export function CommercialStory({
  r, price, rate, termYears, subcategory, appreciationPct, address, trust, onAdjust,
}: {
  r: AnalysisResult; price: number; rate: number; termYears: number; subcategory: string | null;
  appreciationPct: number; address: string | null; trust: ReactNode; onAdjust: () => void;
}) {
  const loanYear = r.monthlyMortgage * 12;
  const yearly = r.annualCashFlow;
  const band = (subcategory && CLASS_YIELD[subcategory]) || DEFAULT_YIELD;
  const typeName = subcategory ? subcategory.toLowerCase().replace("&", "og") : "erhvervsejendomme";
  const yieldTone = r.capRate < band.low || r.capRate > band.high ? "warn" : "good";
  const yieldNote = r.capRate < band.low
    ? "Det er lavt for typen. Prisen er høj i forhold til lejen."
    : r.capRate > band.high
      ? "Det er usædvanligt højt for typen. Ofte et tegn på en risiko, fx en svag lejer eller tomme lokaler."
      : r.capRate >= band.goodLo
        ? "Det er et fornuftigt niveau for typen."
        : "Det er i den lave ende for typen.";
  // Of every 100 kr. the tenant pays, how much goes to the bank and to you.
  const toBank = r.noi > 0 ? Math.min(100, Math.round((loanYear / r.noi) * 100)) : 100;

  // What higher interest does to the monthly result, from the same loan.
  const base = Math.round(rate * 10) / 10;
  const rows = [0, 1, 2, 3].map((d) => {
    const at = base + d;
    const cf = r.cashFlow + (r.monthlyMortgage - monthlyPayment(r.loan, at, termYears));
    return { at, cf, today: d === 0 };
  });
  const checks = [...(subcategory && BY_TYPE[subcategory] ? BY_TYPE[subcategory] : []), ...COMMON];

  // Ten years, in three plain building blocks.
  const last = r.projection[r.projection.length - 1];
  const cashOut = last?.cumulativeCashFlow ?? 0;
  const paidDown = last ? r.loan - last.loanBalance : 0;
  const growth = last ? last.propertyValue - price : 0;
  const endMoney = r.cashInvested + r.totalProfit;
  const times = r.cashInvested > 0 ? endMoney / r.cashInvested : 0;
  const blocks = [
    { k: "Overskud udbetalt", v: cashOut, dot: "bg-emerald-500", note: "Lejen efter lånet, lagt sammen år for år" },
    { k: "Lånet betalt ned", v: paidDown, dot: "bg-[#a9c4fb]", note: "Lejeren betaler dit lån af for dig" },
    { k: "Værdistigning", v: growth, dot: "bg-blue-600", note: `Hvis ejendommen stiger ${pct1(appreciationPct)} om året` },
  ];

  return (
    <>
      {/* 1. Money */}
      <Part id="oekonomi" tint q="Tjener den penge?" tone={yearly >= 0 ? "good" : "bad"}
        a={yearly >= 0 ? `Ja. Du får ${kr(yearly)} om året, når lånet er betalt.` : `Nej. Du skal selv lægge ${kr(-yearly)} til om året.`}>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <div className={`${card} overflow-hidden`}>
            <dl className="px-5 pt-5 text-[17px] sm:px-6">
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
                <dd className={`shrink-0 text-[22px] font-bold tabular-nums ${yearly >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(yearly)}</dd>
              </div>
              <p className="pb-5 pt-1 text-[15px] text-slate-600">Det er {kr(Math.abs(r.cashFlow))} om måneden{yearly < 0 ? ", som du selv skal lægge til" : ""}.</p>
            </dl>
            <dl className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50/70">
              <div className="min-w-0 px-5 py-4 sm:px-6">
                <dt className="text-[14px] text-slate-500">Du lægger selv</dt>
                <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-slate-900">{kr(r.cashInvested)}</dd>
              </div>
              <div className="min-w-0 px-5 py-4 sm:px-6">
                <dt className="text-[14px] text-slate-500">Lån</dt>
                <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-slate-900">{kr(r.loan)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-6">
            <div className={`${card} p-5 sm:p-6`}>
              <p className="text-[17px] text-slate-800">Af hver <b className="font-semibold">100 kr.</b> lejeren betaler, går</p>
              <div className="mt-4 flex h-12 overflow-hidden rounded-xl text-[15px] font-semibold tabular-nums">
                <span className="flex items-center justify-center bg-slate-200 text-slate-700" style={{ width: `${Math.max(toBank, 18)}%` }}>{toBank} kr.</span>
                {toBank < 100 && <span className="flex flex-1 items-center justify-center bg-emerald-500 text-white">{100 - toBank} kr.</span>}
              </div>
              <div className="mt-2.5 flex justify-between text-[15px] text-slate-600">
                <span>til banken</span>
                {toBank < 100 && <span>til dig</span>}
              </div>
            </div>
            <div className={`${card} p-5 sm:p-6`}>
              <p className="text-[17px] text-slate-800">
                Ejendommen giver <b className={`font-semibold tabular-nums ${yieldTone === "good" ? "text-emerald-700" : "text-amber-700"}`}>{pct1(r.capRate)}</b> om året af prisen. For {typeName} ligger det normalt mellem {pct1(band.goodLo)} og {pct1(band.goodHi)}.
              </p>
              <YieldScale value={r.capRate} band={band} />
              <p className="mt-3 text-[15px] text-slate-600">{yieldNote}</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={onAdjust} className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-900 hover:border-slate-400 active:translate-y-px">
          <SlidersHorizontal size={18} strokeWidth={1.8} /> Ret pris, udbetaling eller rente
        </button>
      </Part>

      {/* 2. Interest */}
      <Part id="risici" q="Hvad hvis renten stiger?" tone={r.breakEvenRate - base >= 2 ? "good" : r.breakEvenRate > base ? "warn" : "bad"}
        a={r.breakEvenRate > base ? `Renten kan stige til ${pct1(r.breakEvenRate)}, før lejen ikke længere betaler lånet.` : "Lejen betaler ikke lånet ved dagens rente."}>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className={`${card} p-5 sm:p-6`}>
            <table className="w-full text-[17px]">
              <thead>
                <tr className="text-left text-[14px] text-slate-500">
                  <th className="pb-2 font-medium">Renten</th>
                  <th className="pb-2 text-right font-medium">Tilbage til dig pr. md.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((x) => (
                  <tr key={x.at} className={x.today ? "bg-slate-50" : ""}>
                    <td className="py-3 pl-1 text-slate-700">{pct1(x.at)}{x.today && <span className="ml-2 text-[14px] text-slate-500">i dag</span>}</td>
                    <td className={`py-3 pr-1 text-right font-semibold tabular-nums ${x.cf >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(x.cf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`${card} p-5 sm:p-6`}>
            <p className="text-[15px] text-slate-500">Hvor meget renten kan stige</p>
            <RateRoom today={base} breakEven={r.breakEvenRate} />
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              Erhvervslån har ofte variabel rente. Derfor er det vigtigt, at der er luft, hvis renten stiger. {r.breakEvenRate - base >= 3 ? "Her er der god luft." : r.breakEvenRate > base ? "Her er luften lille, så overvej en større udbetaling eller fast rente." : "Overvej en lavere pris eller en større udbetaling."}
            </p>
          </div>
        </div>
      </Part>

      {/* 3. Ten years */}
      <Part id="fremtid" tint q={`Hvad bliver det til om ${r.holdYears} år?`} tone={r.totalProfit >= 0 ? "good" : "bad"}
        a={`Dine ${mio(r.cashInvested)} kan blive til ${mio(Math.max(0, endMoney))}`}>
        <div className={`${card} p-5 sm:p-8`}>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center">
            <div>
              <p className="text-[15px] text-slate-500">Din samlede gevinst efter {r.holdYears} år</p>
              <p className={`mt-1 text-[40px] font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-[52px] ${r.totalProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(r.totalProfit)}</p>
              {times > 0 && <p className="mt-3 text-[17px] text-slate-700">Det er <b className="font-semibold">{times.toLocaleString("da-DK", { maximumFractionDigits: 1 })} gange</b> de penge, du lægger i den.</p>}
            </div>
            <ul className="space-y-3">
              {blocks.map((b) => (
                <li key={b.k} className="rounded-xl bg-slate-50 px-4 py-3">
                  <span className="flex items-baseline gap-2.5">
                    <span className={`h-3 w-3 shrink-0 translate-y-[1px] rounded-full ${b.dot}`} />
                    <span className="min-w-0 flex-1 text-[16px] font-medium text-slate-900">{b.k}</span>
                    <span className={`shrink-0 text-[17px] font-semibold tabular-nums ${b.v >= 0 ? "text-slate-900" : "text-rose-600"}`}>{signed(b.v)}</span>
                  </span>
                  <span className="mt-0.5 block pl-[22px] text-[13px] text-slate-500">{b.note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="mb-1 text-[16px] font-semibold text-slate-900">Sådan vokser din formue år for år</p>
            <WealthChart data={r.projection.map((y) => ({ year: y.year, paid: price - y.loanBalance, growth: y.propertyValue - price, cumulativeCashFlow: y.cumulativeCashFlow }))} />
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-slate-500">Gevinsten er efter salgsomkostninger, men før skat. Den regner med {pct1(appreciationPct)} værdistigning om året og samme rente hele perioden.</p>
        </div>
      </Part>

      {/* 4. Checks */}
      <Part id="tjek" q="Tjek det her, før du byder" tone="neutral" a="Det, en erfaren investor altid beder om. Tryk på et punkt for at se hvorfor.">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <ul className={`${card} divide-y divide-slate-100 px-5 sm:px-6`}>
            {checks.map((c) => (
              <li key={c.title}>
                <details className="group py-1">
                  <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 text-[17px] text-slate-900 [&::-webkit-details-marker]:hidden">
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
                    <span className="flex-1">{c.title}</span>
                    <ChevronDown size={18} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="pb-4 pl-8 text-[15px] leading-relaxed text-slate-600">{c.why}</p>
                </details>
              </li>
            ))}
          </ul>
          {address && <div className="min-w-0"><FutureBurdens address={address} /></div>}
        </div>
      </Part>

      {/* 5. Trust */}
      <Part id="data" tint q="Kan du stole på tallene?" tone="neutral" a="Lejen og afkastet kommer fra sælgers annonce. Resten er regnet ud af os.">
        {trust}
      </Part>
    </>
  );
}

/** Where the yield sits on the normal range for the type: one bar, one marker. */
function YieldScale({ value, band }: { value: number; band: { low: number; goodLo: number; goodHi: number; high: number } }) {
  const lo = Math.max(0, band.low - 1.5), hi = band.high + 1.5;
  const x = (v: number) => `${((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="mt-5">
      <div className="relative h-3 rounded-full bg-slate-100">
        <span className="absolute inset-y-0 rounded-full bg-emerald-200" style={{ left: x(band.goodLo), right: `calc(100% - ${x(band.goodHi)})` }} />
        <span className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-slate-900 shadow" style={{ left: x(value) }} />
      </div>
      <div className="mt-2 flex justify-between text-[13px] text-slate-500">
        <span>Lavt</span><span className="text-emerald-700">Normalt</span><span>Højt</span>
      </div>
    </div>
  );
}

/** Today's rate and the rate where the rent stops covering the loan, on one line. */
function RateRoom({ today, breakEven }: { today: number; breakEven: number }) {
  const max = Math.max(12, Math.ceil(breakEven + 1));
  const x = (v: number) => `${(Math.min(Math.max(v, 0), max) / max) * 100}%`;
  const ok = breakEven > today;
  return (
    <div className="mt-4">
      <div className="relative h-4 overflow-hidden rounded-full bg-rose-100">
        <span className="absolute inset-y-0 left-0 bg-emerald-400" style={{ width: x(ok ? breakEven : 0) }} />
        <span className="absolute inset-y-0 w-1 -translate-x-1/2 bg-slate-900" style={{ left: x(today) }} />
      </div>
      <div className="relative mt-2 h-10 text-[14px]">
        <span className="absolute -translate-x-1/2 text-center font-semibold text-slate-900" style={{ left: x(today) }}>{pct1(today)}<span className="block text-[12px] font-normal text-slate-500">i dag</span></span>
        {ok && <span className="absolute -translate-x-1/2 text-center font-semibold text-emerald-700" style={{ left: `min(${x(breakEven)}, 88%)` }}>{pct1(breakEven)}<span className="block text-[12px] font-normal text-slate-500">grænsen</span></span>}
      </div>
      {ok && <p className="mt-2 text-[17px] text-slate-800">Der er <b className="font-semibold text-emerald-700">{pct1(breakEven - today)}-point</b> luft.</p>}
    </div>
  );
}
