"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { analyze } from "@/lib/analysis";
import { assessInvestment } from "@/lib/deals";
import type { HeroMetric } from "@/components/analyzer/story/DealHero";
import { CommercialStory } from "@/components/analyzer/CommercialStory";
import { BuyerContact } from "@/components/shared/BuyerContact";
import { NumberInput } from "@/components/ui/NumberInput";
import { budget, maintenanceAllowance, rentLossPct, type OpsFacts } from "@/lib/investment-ops";
import type { Dossier } from "@/lib/dossier";
import type { MarketRates } from "@/lib/market-rates";

/*
 * The analysis behind a shared link, open to anyone who has it. Same verdict
 * card and investor story as inside the app; the reader can move the down
 * payment and the rate, and everything recalculates.
 */

export type SharedListing = {
  slug?: string; url: string; price: number; rent: number; subcat: string | null; addr: string; imgs?: string[]; direct?: boolean;
  /** From the listing (annual operating costs, floor area) and BBR (building and renovation year). */
  opex?: number | null; area?: number | null; builtYear?: number | null; renovatedYear?: number | null; areaSource?: "annonce" | "bbr";
  dossier?: Dossier | null;
};

/** The site the listing is on, for "Annoncen på …". */
const sourceOf = (u: string) => { try { const h = new URL(u).hostname.replace(/^www\./, ""); return /ejendomstorvet/.test(h) ? "Ejendomstorvet" : h; } catch { return "mæglerens side"; } };
const dk = (n: number) => Math.round(n).toLocaleString("da-DK");
const num = (n: number) => n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function SharedAnalysis({ listing: l, rates }: { listing: SharedListing; rates?: MarketRates | null }) {
  const [dp, setDp] = useState(40);
  // Today's fixed mortgage rate for companies incl. contribution (Nationalbanken), else 5 %.
  const marketFixed = rates ? Math.round(rates.company.fixed * 100) / 100 : null;
  const marketVar = rates ? Math.round(rates.company.variable * 100) / 100 : null;
  const [rate, setRate] = useState(marketFixed ?? 5);
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
    mix: l.dossier?.units ? { residentialArea: l.dossier.units.residentialArea, commercialArea: l.dossier.units.commercialArea } : null,
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
        {/* Report head (design.md): date line, address, verdict in words, one photo, key figures as a table row. */}
        <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:gap-12">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-muted)]">
              Investeringsanalyse · {new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })} · {`Erhverv${l.subcat ? `, ${l.subcat.toLowerCase()}` : ""}`}
            </p>
            <h1 className="mt-4 text-[34px] font-semibold leading-[1.1] text-[var(--color-ink)] [overflow-wrap:anywhere] sm:text-[44px]">{l.addr.split(",")[0]}</h1>
            <p className="mt-2 text-[16px] text-[var(--color-ink-2)]">
              {l.addr.split(",").slice(1).join(",").trim()} · udbudspris {dk(l.price)} kr.
              {!/nordinvest\.io/i.test(l.url) && <> · <a href={l.url} target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--color-accent)] underline-offset-4 hover:text-[var(--color-ink)]">annoncen på {sourceOf(l.url)}</a></>}
            </p>
            <p className="mt-6 max-w-[62ch] text-[18px] leading-[1.6] text-[var(--color-ink)]">
              <b className="font-semibold">{inv.rating === "Stærk" || inv.rating === "Solid" ? inv.rating : inv.rating === "Middel" ? "Marginal" : "Svag"} på sælgers tal</b>
              <span className="text-[var(--color-muted)]"> ({inv.score} af 100). </span>{verdict}
            </p>
            {inv.note && <p className="mt-2 max-w-[62ch] text-[15px] text-amber-800">{inv.note}</p>}
          </div>
          {l.imgs?.[0] && (
            <figure className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.imgs[0]} alt={`${l.addr}, foto fra annoncen`} className="aspect-[4/3] w-full rounded-md border border-[var(--color-rule)] object-cover" fetchPriority="high" />
              <figcaption className="mt-1.5 font-[family-name:var(--font-mono)] text-[11.5px] text-[var(--color-muted)]">Foto fra annoncen{l.imgs.length > 1 ? ` (1 af ${l.imgs.length})` : ""}</figcaption>
            </figure>
          )}
        </header>
        <dl className="mt-8 grid grid-cols-2 border-y-2 border-[var(--color-ink)] sm:grid-cols-4">
          {metrics.map((m, i) => (
            <div key={m.label} className={`py-3 ${i % 2 ? "pl-4" : "pr-4"} sm:px-4 ${i > 0 ? "sm:border-l sm:border-[var(--color-rule)]" : "sm:pl-0"} ${i > 1 ? "border-t border-[var(--color-rule)] sm:border-t-0" : ""}`}>
              <dt className="text-[13px] text-[var(--color-muted)]">{m.label}</dt>
              <dd className={`mt-0.5 font-[family-name:var(--font-display)] text-[24px] font-semibold ${m.tone === "good" ? "text-emerald-800" : m.tone === "bad" ? "text-rose-700" : m.tone === "warn" ? "text-amber-800" : "text-[var(--color-ink)]"}`}>{m.value}{m.unit ? <span className="ml-1 text-[14px] font-normal text-[var(--color-muted)]">{m.unit}</span> : null}</dd>
            </div>
          ))}
        </dl>

        <section id="juster" className="mt-10 scroll-mt-24">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[22px] font-semibold text-[var(--color-ink)]">Driftsbudget og finansiering</h2>
            <p className="text-[14px] text-slate-500">Købspris {dk(l.price)} kr. · driftsresultat i annoncen {dk(l.rent * 12)} kr. om året</p>
          </div>
          <p className="mt-1 max-w-[70ch] text-[14px] text-slate-600">Felterne er udfyldt med annoncens og BBR&apos;s tal. Har I lejeliste og regnskab, så skriv de faktiske tal ind. Alt regnes om med det samme.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="f-rent" label="Lejeindtægt pr. år" hint={rentIn ? "Indtastet" : `Beregnet: ${dk(b.rent)} kr.`} value={rentIn} onChange={setRentIn} placeholder={dk(b.rent)} />
            <Field id="f-opex" label="Driftsudgifter pr. år" hint={l.opex != null ? `Annonce: ${dk(l.opex)} kr.` : "Ikke oplyst i annoncen"} value={opexIn} onChange={setOpexIn} placeholder={dk(b.opex)} />
            <Field id="f-area" label="Areal (m²)" hint={l.area != null ? `${l.areaSource === "bbr" ? "BBR" : "Annonce"}: ${dk(l.area)} m²` : "Ikke oplyst"} value={areaIn} onChange={setAreaIn} />
            <Field id="f-year" label="Byggeår" hint={l.builtYear ? `BBR: ${l.builtYear}${l.renovatedYear ? `, ombygget ${l.renovatedYear}` : ""}` : "Ikke fundet i BBR"} value={yearIn} onChange={setYearIn} group={false} />
            <Field id="f-allow" label="Ekstra vedligehold (kr. pr. m² om året)" hint={`Forsigtigt skøn efter alder${facts.mix && facts.mix.commercialArea > 0 && facts.mix.residentialArea > 0 ? " og fordeling af bolig og erhverv" : ""}: ${allowIn == null && b.maintenancePerM2 ? b.maintenancePerM2 : defAllowance} kr.`} value={allowIn} onChange={setAllowIn} placeholder={String(allowIn == null && b.maintenancePerM2 ? b.maintenancePerM2 : defAllowance)} />
            <Field id="f-loss" label="Lejetab og tomgang (%)" hint={`Forsigtigt skøn: ${rentLossPct(l.subcat)} %`} value={lossIn} onChange={setLossIn} placeholder={String(rentLossPct(l.subcat))} decimals={1} />
          </div>
          <div className="mt-6 grid gap-6 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <Slider label="Udbetaling" value={dp} min={10} max={100} step={5} unit="%" sub={`${dk((l.price * dp) / 100)} kr. Erhverv belånes typisk højst 60 %.`} onChange={setDp} />
            <div>
              <Slider label="Rente på lånet" value={rate} min={2} max={9} step={0.05} unit="%" sub="Inkl. bidrag" onChange={setRate} />
              {rates && marketFixed != null && marketVar != null && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {[["Fast, over 10 år", marketFixed], ["Variabel", marketVar]].map(([t, v]) => (
                      <button key={String(t)} type="button" onClick={() => setRate(Number(v))} aria-pressed={rate === v}
                        className={`min-h-[36px] rounded-lg px-3 text-[13px] font-semibold ring-1 ring-inset ${rate === v ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-300 hover:ring-slate-400"}`}>
                        {t}: {Number(v).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[12px] text-slate-500">Markedsrente på nye realkreditlån til virksomheder, {rates.label}. Kilde: Danmarks Nationalbank. Bankens tilbud kan afvige.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-4">
        <CommercialStory
          r={r} price={l.price} rate={rate} termYears={30} subcategory={l.subcat} address={null} onAdjust={adjust}
          facts={facts} allowancePerM2={allowIn} lossPct={lossIn} dossier={l.dossier ?? null}
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

      <div className="mx-auto mt-10 max-w-[1080px] px-4 sm:px-6">
        <p className="max-w-[70ch] border-t-2 border-[var(--color-ink)] pt-6 text-[16px] leading-relaxed text-[var(--color-ink-2)]">
          Analysen er lavet med NordInvest, et analyseværktøj til danske ejendomsinvestorer og mæglere.{" "}
          <Link href="/adgang?kilde=delt-analyse" className="font-semibold text-[var(--color-ink)] underline decoration-[var(--color-accent)] underline-offset-4">Anmod om adgang</Link>{" "}
          eller <Link href="/" className="font-medium text-[var(--color-ink)] underline decoration-[var(--color-accent)] underline-offset-4">læs, hvordan tallene bliver regnet</Link>.
        </p>
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
