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
 * is open and uses the standard Danish investment terms.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${kr(Math.abs(n))}`;
const pct1 = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %`;

type Check = { title: string; why: string };

const COMMON: Check[] = [
  { title: "Lejekontrakter", why: "Gennemgå alle lejekontrakter: uopsigelighed, regulering af lejen og lejerens forpligtelser. Afkastet i annoncen forudsætter, at lejen bliver betalt." },
  { title: "Lejerens økonomi", why: "Slå lejeren op på CVR og gennemgå de seneste regnskaber. En lejer med underskud øger risikoen for tomgang." },
  { title: "Fordeling af vedligeholdelse", why: "Kontrollér, hvad lejer og udlejer hver især skal vedligeholde. Udvendig vedligeholdelse af tag, facade og installationer kan ændre afkastet mærkbart." },
  { title: "Driftsbudget og regnskab", why: "Bed om driftsbudget og seneste regnskab for ejendommen. Kontrollér ejendomsskat, forsikring og administration op mod annoncens tal." },
];
const BY_TYPE: Record<string, Check[]> = {
  "Lager & produktion": [{ title: "Miljø og forurening", why: "Undersøg jordforurening hos regionen, og om der har været værksted eller olietank på grunden. Oprydning påhviler ejeren." }],
  "Detailhandel & butik": [{ title: "Beliggenhed og kundegrundlag", why: "Butikslejemål afhænger af passage. Se på tomme butikker i området, og hvor længe de har stået tomme." }],
  "Kontor": [{ title: "Kontorudbud i området", why: "Kontorlejere kan fraflytte, når kontrakten udløber. Undersøg, hvor mange kontorlejemål der er til leje i byen." }],
  "Boligudlejning": [{ title: "Huslejeregulering", why: "Boliger i ejendomme taget i brug før 1992 har ofte reguleret husleje. Kontrollér, at den aktuelle leje er lovlig." }],
  "Hotel & restaurant": [{ title: "Forpagterens økonomi", why: "Lejen afhænger af, at forretningen kører. Bed om omsætning og regnskab for de seneste tre år." }],
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
    ? "Lavt for ejendomstypen. Prisen er høj i forhold til lejeindtægten."
    : r.capRate > band.high
      ? "Usædvanligt højt for ejendomstypen. Det skyldes ofte en risiko, fx en svag lejer eller tomgang."
      : r.capRate > band.goodHi
        ? "Højt for ejendomstypen. Undersøg beliggenhed og lejerens betalingsevne."
        : r.capRate >= band.goodLo
        ? "Normalt niveau for ejendomstypen."
        : "I den lave ende for ejendomstypen.";
  // How the operating result splits between the loan payment and cash flow.
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
    { k: "Akkumuleret cash flow", v: cashOut, dot: "bg-emerald-500", note: "Cash flow efter finansiering, summeret over perioden" },
    { k: "Afdrag på lån", v: paidDown, dot: "bg-[#a9c4fb]", note: "Nedbragt gæld, betalt af lejeindtægten" },
    { k: "Værdistigning", v: growth, dot: "bg-blue-600", note: `Ved ${pct1(appreciationPct)} årlig værdistigning` },
  ];

  return (
    <>
      {/* 1. Money */}
      <Part id="oekonomi" tint q="Økonomi" tone={yearly >= 0 ? "good" : "bad"}
        a={yearly >= 0 ? `Positivt cash flow på ${kr(yearly)} om året efter finansiering.` : `Negativt cash flow på ${kr(-yearly)} om året efter finansiering.`}>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <div className={`${card} overflow-hidden`}>
            <dl className="px-5 pt-5 text-[17px] sm:px-6">
              <div className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-slate-700">Driftsresultat <span className="text-slate-500">(leje efter driftsudgifter)</span></dt>
                <dd className="shrink-0 font-semibold tabular-nums text-emerald-700">{signed(r.noi)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-slate-700">Ydelse på lån <span className="text-slate-500">(renter og afdrag)</span></dt>
                <dd className="shrink-0 font-semibold tabular-nums text-slate-500">{signed(-loanYear)}</dd>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-slate-900 pt-3">
                <dt className="text-[18px] font-semibold text-slate-900">Cash flow pr. år</dt>
                <dd className={`shrink-0 text-[22px] font-bold tabular-nums ${yearly >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(yearly)}</dd>
              </div>
              <p className="pb-5 pt-1 text-[15px] text-slate-600">Svarer til {signed(r.cashFlow)} pr. måned.</p>
            </dl>
            <dl className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50/70">
              <div className="min-w-0 px-5 py-4 sm:px-6">
                <dt className="text-[14px] text-slate-500">Egenkapital</dt>
                <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-slate-900">{kr(r.cashInvested)}</dd>
              </div>
              <div className="min-w-0 px-5 py-4 sm:px-6">
                <dt className="text-[14px] text-slate-500">Lånebeløb</dt>
                <dd className="mt-0.5 text-[18px] font-semibold tabular-nums text-slate-900">{kr(r.loan)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-6">
            <div className={`${card} p-5 sm:p-6`}>
              <p className="text-[17px] font-semibold text-slate-900">Fordeling af driftsresultatet</p>
              <div className="mt-4 flex h-12 overflow-hidden rounded-xl text-[15px] font-semibold tabular-nums">
                <span className="flex items-center justify-center bg-slate-200 text-slate-700" style={{ width: `${Math.max(toBank, 18)}%` }}>{toBank} %</span>
                {toBank < 100 && <span className="flex flex-1 items-center justify-center bg-emerald-500 text-white">{100 - toBank} %</span>}
              </div>
              <div className="mt-2.5 flex justify-between text-[15px] text-slate-600">
                <span>Ydelse på lån</span>
                {toBank < 100 && <span>Cash flow</span>}
              </div>
            </div>
            <div className={`${card} p-5 sm:p-6`}>
              <p className="text-[17px] text-slate-800">
                Nettoafkast: <b className={`font-semibold tabular-nums ${yieldTone === "good" ? "text-emerald-700" : "text-amber-700"}`}>{pct1(r.capRate)}</b>. Det normale niveau for {typeName} er {pct1(band.goodLo)} til {pct1(band.goodHi)}.
              </p>
              <YieldScale value={r.capRate} band={band} />
              <p className="mt-3 text-[15px] text-slate-600">{yieldNote}</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={onAdjust} className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-900 hover:border-slate-400 active:translate-y-px">
          <SlidersHorizontal size={18} strokeWidth={1.8} /> Ret pris, udbetaling og rente
        </button>
      </Part>

      {/* 2. Interest */}
      <Part id="risici" q="Rentefølsomhed" tone={r.breakEvenRate - base >= 2 ? "good" : r.breakEvenRate > base ? "warn" : "bad"}
        a={r.breakEvenRate > base ? `Break-even-renten er ${pct1(r.breakEvenRate)}. Over den dækker driftsresultatet ikke længere ydelsen.` : "Driftsresultatet dækker ikke ydelsen ved den nuværende rente."}>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className={`${card} p-5 sm:p-6`}>
            <table className="w-full text-[17px]">
              <thead>
                <tr className="text-left text-[14px] text-slate-500">
                  <th className="pb-2 font-medium">Rente</th>
                  <th className="pb-2 text-right font-medium">Cash flow pr. md.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((x) => (
                  <tr key={x.at} className={x.today ? "bg-slate-50" : ""}>
                    <td className="py-3 pl-1 text-slate-700">{pct1(x.at)}{x.today && <span className="ml-2 text-[14px] text-slate-500">aktuel</span>}</td>
                    <td className={`py-3 pr-1 text-right font-semibold tabular-nums ${x.cf >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(x.cf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`${card} p-5 sm:p-6`}>
            <p className="text-[15px] text-slate-500">Rentebuffer</p>
            <RateRoom today={base} breakEven={r.breakEvenRate} />
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              Erhvervslån har ofte variabel rente, så rentebufferen har betydning. {r.breakEvenRate - base >= 3 ? "Bufferen er god." : r.breakEvenRate > base ? "Bufferen er lille. En større udbetaling eller fast rente giver mere sikkerhed." : "Handlen kræver en lavere pris eller en større udbetaling."}
            </p>
          </div>
        </div>
      </Part>

      {/* 3. Ten years */}
      <Part id="fremtid" tint q={`Afkast over ${r.holdYears} år`} tone={r.totalProfit >= 0 ? "good" : "bad"}
        a={`En egenkapital på ${mio(r.cashInvested)} kan vokse til ${mio(Math.max(0, endMoney))}`}>
        <div className={`${card} p-5 sm:p-8`}>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center">
            <div>
              <p className="text-[15px] text-slate-500">Samlet gevinst efter {r.holdYears} år</p>
              <p className={`mt-1 text-[40px] font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-[52px] ${r.totalProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(r.totalProfit)}</p>
              {times > 0 && <p className="mt-3 text-[17px] text-slate-700">Svarer til <b className="font-semibold">{times.toLocaleString("da-DK", { maximumFractionDigits: 1 })} gange</b> den investerede egenkapital.</p>}
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
            <p className="mb-1 text-[16px] font-semibold text-slate-900">Udvikling i friværdi og cash flow</p>
            <WealthChart data={r.projection.map((y) => ({ year: y.year, paid: price - y.loanBalance, growth: y.propertyValue - price, cumulativeCashFlow: y.cumulativeCashFlow }))} />
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-slate-500">Gevinsten er efter salgsomkostninger og før skat. Beregningen forudsætter {pct1(appreciationPct)} årlig værdistigning og uændret rente i hele perioden.</p>
        </div>
      </Part>

      {/* 4. Checks */}
      <Part id="tjek" q="Tjekliste før bud" tone="neutral" a="Punkter, der bør være undersøgt, før du afgiver bud.">
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
      <Part id="data" tint q="Datagrundlag" tone="neutral" a="Pris og afkast stammer fra sælgers annonce. Øvrige tal er beregnet af NordInvest.">
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
        <span className="absolute -translate-x-1/2 text-center font-semibold text-slate-900" style={{ left: x(today) }}>{pct1(today)}<span className="block text-[12px] font-normal text-slate-500">aktuel</span></span>
        {ok && <span className="absolute -translate-x-1/2 text-center font-semibold text-emerald-700" style={{ left: `min(${x(breakEven)}, 88%)` }}>{pct1(breakEven)}<span className="block text-[12px] font-normal text-slate-500">break-even</span></span>}
      </div>
      {ok && <p className="mt-2 text-[17px] text-slate-800">Renten kan stige <b className="font-semibold text-emerald-700">{(breakEven - today).toLocaleString("da-DK", { maximumFractionDigits: 1 })} procentpoint</b>, før cash flow bliver negativt.</p>}
    </div>
  );
}
