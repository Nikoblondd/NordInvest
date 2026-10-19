"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { analyze } from "@/lib/analysis";
import { assessInvestment } from "@/lib/deals";
import { AppHero } from "@/components/analyzer/story/AppHero";
import type { HeroMetric } from "@/components/analyzer/story/DealHero";
import { CommercialStory } from "@/components/analyzer/CommercialStory";
import { BuyerContact } from "@/components/shared/BuyerContact";
import { NumberInput } from "@/components/ui/NumberInput";
import { budget, maintenanceAllowance, rentLossPct, type OpsFacts } from "@/lib/investment-ops";

/*
 * The analysis behind a shared link, open to anyone who has it. Same verdict
 * card and investor story as inside the app; the reader can move the down
 * payment and the rate, and everything recalculates.
 */

export type SharedListing = {
  slug?: string; url: string; price: number; rent: number; subcat: string | null; addr: string; imgs?: string[]; direct?: boolean;
  /** From the listing (annual operating costs, floor area) and BBR (building and renovation year). */
  opex?: number | null; area?: number | null; builtYear?: number | null; renovatedYear?: number | null; areaSource?: "annonce" | "bbr";
};

/** The site the listing is on, for "Annoncen på …". */
const sourceOf = (u: string) => { try { const h = new URL(u).hostname.replace(/^www\./, ""); return /ejendomstorvet/.test(h) ? "Ejendomstorvet" : h; } catch { return "mæglerens side"; } };
const dk = (n: number) => Math.round(n).toLocaleString("da-DK");
const num = (n: number) => n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function SharedAnalysis({ listing: l }: { listing: SharedListing }) {
  const [dp, setDp] = useState(40);
  const [rate, setRate] = useState(5);
  // The professional's own figures override the listing's: gross rent and
  // running costs from the rent roll and accounts, area and building year.
  const [rentIn, setRentIn] = useState<number | null>(null);
  const [opexIn, setOpexIn] = useState<number | null>(l.opex ?? null);
  const [areaIn, setAreaIn] = useState<number | null>(l.area ?? null);
  const [yearIn, setYearIn] = useState<number | null>(l.builtYear ?? null);
  const defAllowance = maintenanceAllowance(yearIn, yearIn === (l.builtYear ?? null) ? l.renovatedYear : null, l.subcat);
  const [allowIn, setAllowIn] = useState<number | null>(null);
  const [lossIn, setLossIn] = useState<number | null>(null);
  const facts: OpsFacts = {
    price: l.price, noi: l.rent * 12, rent: rentIn, opex: opexIn, area: areaIn, builtYear: yearIn,
    renovatedYear: yearIn === (l.builtYear ?? null) ? l.renovatedYear : null, subcat: l.subcat,
    sources: {
      rent: rentIn ? "indtastet" : undefined,
      opex: opexIn != null && opexIn !== (l.opex ?? null) ? "indtastet" : "annonce",
      area: areaIn != null && areaIn !== (l.area ?? null) ? "indtastet" : l.areaSource ?? "annonce",
      builtYear: yearIn != null && yearIn !== (l.builtYear ?? null) ? "indtastet" : "bbr",
    },
  };
  const b = budget(facts, { allowancePerM2: allowIn, lossPct: lossIn });
  // The seller's operating result (or the professional's own) drives the analysis;
  // vacancy, maintenance and costs are already inside it.
  const r = useMemo(
    () => analyze({ price: l.price, monthlyRent: b.noi / 12, downPaymentPct: dp, interestRate: rate, monthlyOpex: 0, vacancyPct: 0, maintenancePct: 0 }),
    [l.price, b.noi, dp, rate],
  );
  const prudentCf = (b.prudentNoi - r.monthlyMortgage * 12) / 12;
  const inv = assessInvestment(r.capRate, r.dscr, r.cashOnCash, l.subcat);
  const tone = inv.score >= 62 ? "good" : inv.score >= 45 ? "warn" : "bad";
  const verdict = r.cashFlow >= 0
    ? `På sælgers budget ${dk(r.cashFlow)} kr. pr. måned efter finansiering. Med forsigtige tillæg til vedligehold og lejetab: ${prudentCf >= 0 ? "+" : "−"}${dk(Math.abs(prudentCf))} kr.`
    : `På sælgers budget dækker driftsresultatet ikke ydelsen: −${dk(Math.abs(r.cashFlow))} kr. pr. måned efter finansiering.`;
  const metrics: HeroMetric[] = [
    { label: "Cash flow pr. md.", value: `${r.cashFlow >= 0 ? "+" : "−"}${dk(Math.abs(r.cashFlow))}`, unit: "kr", tone: r.cashFlow >= 0 ? "good" : "bad" },
    { label: "Nettoafkast", value: num(r.capRate), unit: "%", tone },
    { label: "Egenkapital", value: dk(r.cashInvested), unit: "kr", tone: "neutral", note: "Udbetaling og købsomkostninger" },
    { label: "Gældsdækning (DSCR)", value: num(r.dscr), tone: r.dscr >= 1.25 ? "good" : r.dscr >= 1 ? "warn" : "bad" },
  ];
  const adjust = () => document.getElementById("juster")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <main className="pb-4">
      <div className="mx-auto max-w-[1080px] px-4 pt-6 sm:px-6 sm:pt-10">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-medium text-slate-600 ring-1 ring-slate-200">
          <Info size={14} className="text-blue-600" /> Screening på sælgers tal. Ret driftsbudgettet med jeres egne tal nedenfor.
        </p>
        <AppHero
          images={l.imgs ?? []} address={l.addr} score={inv.score} headline={`${inv.rating === "Stærk" || inv.rating === "Solid" ? inv.rating : inv.rating === "Middel" ? "Marginal" : "Svag"} på sælgers tal`}
          verdict={verdict} tone={tone} notes={inv.note ? [inv.note] : []} metrics={metrics} probability={null}
          listingUrl={/nordinvest\.io/i.test(l.url) ? null : l.url} sourceLabel={sourceOf(l.url)} kindLabel={`Erhverv${l.subcat ? `, ${l.subcat}` : ""}`}
        />

        <section id="juster" className="mt-4 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[16px] font-semibold text-slate-900">Driftsbudget og finansiering</p>
            <p className="text-[14px] text-slate-500">Købspris {dk(l.price)} kr. · driftsresultat i annoncen {dk(l.rent * 12)} kr. om året</p>
          </div>
          <p className="mt-1 max-w-[70ch] text-[14px] text-slate-600">Felterne er udfyldt med annoncens og BBR&apos;s tal. Har I lejeliste og regnskab, så skriv de faktiske tal ind. Alt regnes om med det samme.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="f-rent" label="Lejeindtægt pr. år" hint={rentIn ? "Indtastet" : `Beregnet: ${dk(b.rent)} kr.`} value={rentIn} onChange={setRentIn} placeholder={dk(b.rent)} />
            <Field id="f-opex" label="Driftsudgifter pr. år" hint={l.opex != null ? `Annonce: ${dk(l.opex)} kr.` : "Ikke oplyst i annoncen"} value={opexIn} onChange={setOpexIn} placeholder={dk(b.opex)} />
            <Field id="f-area" label="Areal (m²)" hint={l.area != null ? `${l.areaSource === "bbr" ? "BBR" : "Annonce"}: ${dk(l.area)} m²` : "Ikke oplyst"} value={areaIn} onChange={setAreaIn} />
            <Field id="f-year" label="Byggeår" hint={l.builtYear ? `BBR: ${l.builtYear}${l.renovatedYear ? `, ombygget ${l.renovatedYear}` : ""}` : "Ikke fundet i BBR"} value={yearIn} onChange={setYearIn} group={false} />
            <Field id="f-allow" label="Ekstra vedligehold (kr. pr. m² om året)" hint={`Forsigtigt skøn efter alder: ${defAllowance} kr.`} value={allowIn} onChange={setAllowIn} placeholder={String(defAllowance)} />
            <Field id="f-loss" label="Lejetab og tomgang (%)" hint={`Forsigtigt skøn: ${rentLossPct(l.subcat)} %`} value={lossIn} onChange={setLossIn} placeholder={String(rentLossPct(l.subcat))} decimals={1} />
          </div>
          <div className="mt-6 grid gap-6 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <Slider label="Udbetaling" value={dp} min={10} max={100} step={5} unit="%" sub={`${dk((l.price * dp) / 100)} kr. Erhverv belånes typisk højst 60 %.`} onChange={setDp} />
            <Slider label="Rente på lånet" value={rate} min={2} max={9} step={0.25} unit="%" sub="Om året" onChange={setRate} />
          </div>
        </section>
      </div>

      <div className="mt-6 overflow-hidden lg:mx-auto lg:max-w-[1080px] lg:rounded-2xl lg:border lg:border-slate-200">
        <CommercialStory
          r={r} price={l.price} rate={rate} termYears={30} subcategory={l.subcat} address={null} onAdjust={adjust}
          facts={facts} allowancePerM2={allowIn} lossPct={lossIn}
          trust={
            <ul className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-[16px] leading-relaxed text-slate-700 sm:p-6">
              <li><b className="font-semibold text-slate-900">Driftsresultat:</b> sælgers afkast × købspris, med mindre I har indtastet lejeindtægt og driftsudgifter.</li>
              <li><b className="font-semibold text-slate-900">Forsigtige tillæg:</b> ekstra vedligehold efter bygningens alder og lejetab i procent af lejen. NordInvests skøn, som kan rettes.</li>
              <li><b className="font-semibold text-slate-900">Finansiering:</b> annuitetslån over 30 år med den valgte rente og udbetaling. Købsomkostninger 1,5 %.</li>
              <li><b className="font-semibold text-slate-900">Ingen fremskrivning som facit:</b> 10 år vises kun som tre scenarier med åbne forudsætninger.</li>
              <li className="text-[14px] text-slate-500">Analysen er en beregning, ikke rådgivning. <a href="/methodology#investeringsejendomme" className="underline">Se metoden</a>.</li>
            </ul>
          }
        />
      </div>

      {l.slug && (
        <div id="kontakt-maegler" className="mx-auto mt-8 max-w-[1080px] scroll-mt-24 px-4 sm:px-6">
          <BuyerContact slug={l.slug} street={l.addr.split(",")[0]} viaNordInvest={!l.direct} />
        </div>
      )}

      <div className="mx-auto mt-8 max-w-[1080px] px-4 sm:px-6">
        <div className="flex flex-col gap-5 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-[560px]">
            <p className="text-[20px] font-semibold tracking-[-0.01em]">Analyseret med NordInvest</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-300">NordInvest er et analyseværktøj til danske ejendomsinvestorer med analyse, bankrapport, søgeagenter og pipeline.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link href="/adgang?kilde=delt-analyse" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-white px-5 text-[16px] font-semibold text-slate-900 hover:bg-slate-100">Få adgang <ArrowRight size={17} /></Link>
            <Link href="/funktioner" className="text-center text-[14px] font-medium text-slate-300 hover:text-white">Se funktionerne</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ id, label, hint, value, onChange, placeholder, group = true, decimals = 0 }: { id: string; label: string; hint: string; value: number | null; onChange: (n: number | null) => void; placeholder?: string; group?: boolean; decimals?: number }) {
  return (
    <div>
      <label htmlFor={id} className="text-[14px] font-medium text-slate-700">{label}</label>
      <NumberInput id={id} value={value} onValueChange={onChange} placeholder={placeholder} group={group} decimals={decimals} inputMode={decimals ? "decimal" : "numeric"}
        className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
      <p className="mt-1 text-[12px] text-slate-500">{hint}</p>
    </div>
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
