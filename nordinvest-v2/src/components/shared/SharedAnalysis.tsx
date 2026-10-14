"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { analyze } from "@/lib/analysis";
import { assessInvestment } from "@/lib/deals";
import { AppHero } from "@/components/analyzer/story/AppHero";
import type { HeroMetric } from "@/components/analyzer/story/DealHero";
import { CommercialStory } from "@/components/analyzer/CommercialStory";

/*
 * The analysis behind a shared link, open to anyone who has it. Same verdict
 * card and investor story as inside the app; the reader can move the down
 * payment and the rate, and everything recalculates.
 */

export type SharedListing = { url: string; price: number; rent: number; subcat: string | null; addr: string; imgs?: string[] };

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");
const num = (n: number) => n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function SharedAnalysis({ listing: l }: { listing: SharedListing }) {
  const [dp, setDp] = useState(30);
  const [rate, setRate] = useState(5);
  // The passed rent is the seller's net income (stated yield × price), so no
  // second round of vacancy, maintenance or running costs.
  const r = useMemo(
    () => analyze({ price: l.price, monthlyRent: l.rent, downPaymentPct: dp, interestRate: rate, monthlyOpex: 0, vacancyPct: 0, maintenancePct: 0 }),
    [l.price, l.rent, dp, rate],
  );
  const inv = assessInvestment(r.capRate, r.dscr, r.cashOnCash, l.subcat);
  const tone = inv.score >= 62 ? "good" : inv.score >= 45 ? "warn" : "bad";
  const verdict = r.cashFlow >= 0
    ? `Lejen betaler lånet og giver ${dk(r.cashFlow)} kr. tilbage hver måned. ${r.dscr >= 1.25 ? "Der er god luft, hvis renten stiger." : "Der er ikke meget luft, hvis renten stiger."}`
    : `Lejen betaler ikke hele lånet. Du skal selv lægge ${dk(Math.abs(r.cashFlow))} kr. til hver måned.`;
  const metrics: HeroMetric[] = [
    { label: r.cashFlow >= 0 ? "Overskud pr. md." : "Underskud pr. md.", value: `${r.cashFlow >= 0 ? "+" : "−"}${dk(Math.abs(r.cashFlow))}`, unit: "kr", tone: r.cashFlow >= 0 ? "good" : "bad" },
    { label: "Afkast om året", value: num(r.capRate), unit: "%", tone },
    { label: "Du lægger selv", value: dk(r.cashInvested), unit: "kr", tone: "neutral", note: "Udbetaling og købsomkostninger" },
    { label: "Lejen dækker lånet", value: num(r.dscr), unit: "gange", tone: r.dscr >= 1.25 ? "good" : r.dscr >= 1 ? "warn" : "bad" },
  ];
  const adjust = () => document.getElementById("juster")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <main className="pb-4">
      <div className="mx-auto max-w-[1080px] px-4 pt-6 sm:px-6 sm:pt-10">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-medium text-slate-600 ring-1 ring-slate-200">
          <Info size={14} className="text-blue-600" /> Delt analyse fra NordInvest. Tallene kommer fra annoncen.
        </p>
        <AppHero
          images={l.imgs ?? []} address={l.addr} score={inv.score} headline={inv.rating === "Stærk" || inv.rating === "Solid" ? `${inv.rating} investering` : inv.rating === "Middel" ? "Tallene hænger sammen" : "Svag ved disse tal"}
          verdict={verdict} tone={tone} notes={inv.note ? [inv.note] : []} metrics={metrics} probability={null}
          listingUrl={l.url} sourceLabel="Ejendomstorvet" kindLabel={`Erhverv${l.subcat ? `, ${l.subcat}` : ""}`}
        />

        <section id="juster" className="mt-4 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="text-[16px] font-semibold text-slate-900">Prøv med dine egne tal</p>
          <p className="mt-0.5 text-[14px] text-slate-500">Pris {dk(l.price)} kr. Lejen efter driftsudgifter er {dk(l.rent * 12)} kr. om året, som i annoncen.</p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <Slider label="Udbetaling" value={dp} min={10} max={100} step={5} unit="%" sub={`${dk((l.price * dp) / 100)} kr.`} onChange={setDp} />
            <Slider label="Rente på lånet" value={rate} min={2} max={9} step={0.25} unit="%" sub="Om året" onChange={setRate} />
          </div>
        </section>
      </div>

      <div className="mt-6 overflow-hidden lg:mx-auto lg:max-w-[1080px] lg:rounded-2xl lg:border lg:border-slate-200">
        <CommercialStory
          r={r} price={l.price} rate={rate} termYears={30} subcategory={l.subcat} appreciationPct={3} address={null} onAdjust={adjust}
          trust={
            <ul className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-[16px] leading-relaxed text-slate-700 sm:p-6">
              <li><b className="font-semibold text-slate-900">Pris og afkast:</b> fra sælgers annonce på Ejendomstorvet. Lejen er afkastet gange prisen, altså efter driftsudgifter.</li>
              <li><b className="font-semibold text-slate-900">Lånet:</b> annuitetslån over 30 år med den rente og udbetaling, du har valgt ovenfor.</li>
              <li><b className="font-semibold text-slate-900">De 10 år:</b> 3 % værdistigning og 2 % lejestigning om året, købsomkostninger på 1,5 % og salgsomkostninger ved salg. Før skat.</li>
              <li className="text-[14px] text-slate-500">Analysen er et regnestykke, ikke rådgivning. Tjek lejekontrakter og driftsbudget, før du byder.</li>
            </ul>
          }
        />
      </div>

      <div className="mx-auto mt-8 max-w-[1080px] px-4 sm:px-6">
        <div className="flex flex-col gap-5 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-[560px]">
            <p className="text-[20px] font-semibold tracking-[-0.01em]">Regnet igennem med NordInvest</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-300">NordInvest er analyseværktøjet for danske ejendomsinvestorer: analyse, bankrapport, søgeagenter og pipeline samlet ét sted.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link href="/adgang?kilde=delt-analyse" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-white px-5 text-[16px] font-semibold text-slate-900 hover:bg-slate-100">Få adgang <ArrowRight size={17} /></Link>
            <Link href="/funktioner" className="text-center text-[14px] font-medium text-slate-300 hover:text-white">Se hvad det kan</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Slider({ label, value, min, max, step, unit, sub, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; sub: string; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium text-slate-700">{label}</span>
        <span className="text-[18px] font-semibold tabular-nums text-slate-900">{value.toLocaleString("da-DK")} {unit}<span className="ml-2 text-[13px] font-normal text-slate-500">{sub}</span></span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 h-2 w-full cursor-pointer accent-blue-600" />
    </label>
  );
}
