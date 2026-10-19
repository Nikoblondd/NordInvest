"use client";

import type { ReactNode } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { FutureBurdens } from "@/components/analyzer/FutureBurdens";
import { FounderNote } from "@/components/shared/FounderNote";
import { monthlyPayment, type AnalysisResult } from "@/lib/analysis";
import { CLASS_YIELD, DEFAULT_YIELD } from "@/lib/deals";
import { budget, dataQuality, findings, scenarios, stress, type Finding, type OpsFacts, type Source } from "@/lib/investment-ops";
import type { Dossier } from "@/lib/dossier";

/*
 * The analysis of an investeringsejendom, written for a professional reader
 * who answers for every number: year 1 on the seller's own budget next to a
 * prudent version, what today's operation can take before the cash flow is
 * gone, three labelled scenarios instead of one forecast, the checks before a
 * bid, and exactly what the numbers rest on and who stands behind them.
 * The model lives in lib/investment-ops.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${kr(Math.abs(n))}`;
const pct1 = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %`;
const pct2 = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 2 })} %`;
const mio = (n: number) => `${(n / 1e6).toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mio. kr.`;

const SOURCE: Record<Source, string> = { annonce: "annonce", beregnet: "beregnet", bbr: "BBR", indtastet: "indtastet", skøn: "skøn" };
/** The source of a figure, set like a reference note in a printed report. Estimates in brick. */
const Src = ({ s }: { s: Source }) => <span className={`ml-2 font-[family-name:var(--font-mono)] text-[11.5px] ${s === "skøn" ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"}`}>[{SOURCE[s]}]</span>;

type Check = { title: string; why: string };
const COMMON: Check[] = [
  { title: "Lejeliste og lejekontrakter", why: "Bed om lejelisten med leje pr. lejemål, indflytningsdato, depositum og forudbetalt leje. Gennemgå kontrakterne for uopsigelighed, regulering og lejerens vedligeholdelsespligt." },
  { title: "Regnskab for de seneste 3 år", why: "Driftsbudgettet i annoncen er sælgers eget. Sammenlign det med ejendommens faktiske regnskab: ejendomsskat, forsikring, administration, vedligehold og tab på lejere." },
  { title: "Vedligeholdelsesplan og teknisk gennemgang", why: "Få en byggesagkyndig til at vurdere tag, facade, vinduer, kloak og installationer. Store udskiftninger inden for 10 år skal trækkes fra prisen eller indregnes i driften." },
  { title: "Lejerens økonomi", why: "Slå erhvervslejere op på CVR og gennemgå regnskaberne. En lejer med underskud øger risikoen for tomgang." },
];
const BY_TYPE: Record<string, Check[]> = {
  "Boligudlejning": [
    { title: "Lejefastsættelse", why: "Ejendomme taget i brug før 1992 har typisk omkostningsbestemt leje, og nogle lejemål er moderniseret efter § 5, stk. 2. Kontrollér for hvert lejemål, hvilken regel lejen følger, og om den er lovlig. Lejen kan ikke bare følge inflationen." },
    { title: "Hensættelser og istandsættelse", why: "Kontrollér, om der er hensat til vedligeholdelse efter lejeloven, og hvad istandsættelse ved fraflytning koster i praksis." },
  ],
  "Lager & produktion": [{ title: "Miljø og forurening", why: "Undersøg jordforurening hos regionen, og om der har været værksted eller olietank på grunden. Oprydning påhviler ejeren." }],
  "Detailhandel & butik": [{ title: "Beliggenhed og kundegrundlag", why: "Butikslejemål afhænger af passage. Se på tomme butikker i området, og hvor længe de har stået tomme." }],
  "Kontor": [{ title: "Kontorudbud i området", why: "Kontorlejere kan fraflytte, når kontrakten udløber. Undersøg, hvor mange kontorlejemål der er til leje i byen." }],
  "Hotel & restaurant": [{ title: "Forpagterens økonomi", why: "Lejen afhænger af, at forretningen kører. Bed om omsætning og regnskab for de seneste tre år." }],
};

/** One open section: the question, a one-line answer in its colour, then the evidence. */
function Part({ id, tint, q, a, tone, children }: { id: string; tint?: boolean; q: string; a: string; tone: "good" | "warn" | "bad" | "neutral"; children: ReactNode }) {
  const col = tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "bad" ? "text-rose-600" : "text-slate-600";
  return (
    <section id={id} data-tint={tint ? "1" : undefined} className="scroll-mt-24 bg-[var(--color-paper)] px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[1080px] border-t-2 border-[var(--color-ink)] pt-6">
        <h2 className="text-[26px] font-semibold leading-[1.15] text-[var(--color-ink)] [text-wrap:balance] sm:text-[30px]">{q}</h2>
        <p className={`mt-2 max-w-[70ch] text-[17px] leading-relaxed ${col}`}>{a}</p>
        <div className="mt-7">{children}</div>
      </div>
    </section>
  );
}

// No shadows (design.md): a hairline and a slightly lighter paper mark a table or a note.
const card = "rounded-md border border-[var(--color-rule)] bg-[var(--color-paper-2)]";

export function CommercialStory({
  r, price, rate, termYears, subcategory, address, trust, onAdjust, facts, allowancePerM2, lossPct, dossier,
}: {
  r: AnalysisResult; price: number; rate: number; termYears: number; subcategory: string | null;
  /** Kept for callers; scenarios carry their own value assumptions. */
  appreciationPct?: number;
  address: string | null; trust: ReactNode; onAdjust: () => void;
  /** The seller's budget, building facts and their sources. Without it only the operating result is known. */
  facts?: OpsFacts;
  allowancePerM2?: number | null; lossPct?: number | null;
  /** The public record (BBR, VUR, land tax) gathered for this property. */
  dossier?: Dossier | null;
}) {
  const f: OpsFacts = facts ?? { price, noi: r.noi, opex: null, area: null, builtYear: null, subcat: subcategory };
  const dp = price > 0 ? Math.round((1 - r.loan / price) * 1000) / 10 : 20;
  const fin = { downPaymentPct: dp, ratePct: rate, termYears };
  const b = budget({ ...f, noi: r.noi }, { allowancePerM2, lossPct });
  const st = stress(b, price, fin);
  const sc = scenarios({ ...f, noi: r.noi }, b, fin);
  const dq = dataQuality(f, dossier);
  const found = findings(f, b, dossier);
  const debt = st.debtService;
  const cf = b.noi - debt, prudentCf = b.prudentNoi - debt;

  const band = (subcategory && CLASS_YIELD[subcategory]) || DEFAULT_YIELD;
  const typeName = subcategory ? subcategory.toLowerCase().replace("&", "og") : "erhvervsejendomme";
  const yieldTone = r.capRate < band.low || r.capRate > band.high ? "warn" : "good";
  const yieldNote = r.capRate < band.low
    ? "Lavt for ejendomstypen. Prisen er høj i forhold til lejeindtægten."
    : r.capRate > band.high
      ? "Usædvanligt højt for ejendomstypen. Det skyldes ofte en risiko, fx en svag lejer, tomgang eller et stort vedligeholdelsesbehov."
      : r.capRate > band.goodHi
        ? "Højt for ejendomstypen. Undersøg beliggenhed, lejernes betalingsevne og bygningens stand."
        : r.capRate >= band.goodLo ? "Normalt niveau for ejendomstypen." : "I den lave ende for ejendomstypen.";
  const base = Math.round(rate * 100) / 100;
  const rateRows = [0, 1, 2, 3].map((d) => ({ at: base + d, cf: r.cashFlow + (r.monthlyMortgage - monthlyPayment(r.loan, base + d, termYears)), today: d === 0 }));
  const checks = [...(subcategory && BY_TYPE[subcategory] ? BY_TYPE[subcategory] : []), ...COMMON];
  const maxAbs = Math.max(1, ...st.rows.map((x) => Math.abs(x.cashFlow)));
  const worst = st.rows[st.rows.length - 1];
  const oldResidential = subcategory === "Boligudlejning" && (f.builtYear == null || f.builtYear < 1992);

  return (
    <>
      {/* 0. How to read the numbers */}
      <section className="bg-[var(--color-paper)] px-4 pt-8 sm:px-6">
        <div className="mx-auto max-w-[1080px]">
          <p className="max-w-[78ch] text-[16px] leading-relaxed text-[var(--color-ink-2)]">
            <b className="font-semibold text-[var(--color-ink)]">{dq.level === "delvis" ? "Screening på sælgers driftsbudget." : "Foreløbig screening på annoncens afkast."}</b>{" "}
            Bygger på {dq.items.filter((i) => i.ok).map((i) => i.label.toLowerCase()).join(", ")}.{" "}
            Mangler {dq.items.filter((i) => !i.ok).map((i) => i.label.toLowerCase()).join(", ")}, før tallene kan bruges til et bud.
          </p>
        </div>
      </section>

      {/* 1. Year 1 */}
      <Part id="oekonomi" tint q="Økonomi i år 1" tone={prudentCf >= 0 ? "good" : cf >= 0 ? "warn" : "bad"}
        a={cf >= 0
          ? `På sælgers budget giver ejendommen ${kr(cf)} om året efter finansiering. Med forsigtige tillæg: ${signed(prudentCf)}`
          : `På sælgers budget dækker driftsresultatet ikke ydelsen: ${signed(cf)} om året.`}>
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[480px] text-[16px]">
              <caption className="sr-only">Driftsbudget i år 1, sælgers tal og forsigtigt</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-[13px] text-slate-500">
                  <th className="px-5 py-3 font-medium sm:px-6">Pr. år</th>
                  <th className="px-3 py-3 text-right font-medium">Sælgers budget</th>
                  <th className="px-5 py-3 text-right font-medium sm:px-6">Forsigtigt</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr><td className="px-5 pt-3 text-slate-700 sm:px-6">Lejeindtægt<Src s={b.rentSource} /></td><td className="px-3 pt-3 text-right">{kr(b.rent)}</td><td className="px-5 pt-3 text-right sm:px-6">{kr(b.rent)}</td></tr>
                <tr><td className="px-5 py-1.5 text-slate-700 sm:px-6">Driftsudgifter<Src s={b.opexSource} /></td><td className="px-3 py-1.5 text-right text-slate-600">{signed(-b.opex)}</td><td className="px-5 py-1.5 text-right text-slate-600 sm:px-6">{signed(-b.opex)}</td></tr>
                <tr><td className="px-5 py-1.5 text-slate-700 sm:px-6">Ekstra vedligehold<Src s="skøn" /><span className="block text-[13px] text-slate-500">{b.maintenancePerM2 ? `${b.maintenancePerM2} kr. pr. m² om året${f.builtYear ? `, bygget ${f.builtYear}` : ""}` : "5 % af lejen"}</span></td><td className="px-3 py-1.5 text-right text-slate-400">–</td><td className="px-5 py-1.5 text-right text-slate-600 sm:px-6">{signed(-b.maintenance)}</td></tr>
                <tr><td className="px-5 py-1.5 text-slate-700 sm:px-6">Lejetab og tomgang<Src s="skøn" /><span className="block text-[13px] text-slate-500">{pct1(b.rentLossPct)} af lejen</span></td><td className="px-3 py-1.5 text-right text-slate-400">–</td><td className="px-5 py-1.5 text-right text-slate-600 sm:px-6">{signed(-b.rentLoss)}</td></tr>
                <tr className="border-t border-slate-200 font-semibold text-slate-900"><td className="px-5 py-2.5 sm:px-6">Driftsresultat</td><td className="px-3 py-2.5 text-right">{kr(b.noi)}</td><td className="px-5 py-2.5 text-right sm:px-6">{kr(b.prudentNoi)}</td></tr>
                <tr><td className="px-5 py-1.5 text-slate-700 sm:px-6">Ydelse på lån <span className="text-[13px] text-slate-500">({pct2(fin.ratePct)}, {termYears} år)</span></td><td className="px-3 py-1.5 text-right text-slate-600">{signed(-debt)}</td><td className="px-5 py-1.5 text-right text-slate-600 sm:px-6">{signed(-debt)}</td></tr>
                <tr className="border-t-2 border-slate-900"><td className="px-5 py-3 text-[17px] font-semibold text-slate-900 sm:px-6">Cash flow</td>
                  <td className={`px-3 py-3 text-right text-[18px] font-bold ${cf >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(cf)}</td>
                  <td className={`px-5 py-3 text-right text-[18px] font-bold sm:px-6 ${prudentCf >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(prudentCf)}</td></tr>
                <tr><td className="px-5 pb-4 text-[14px] text-slate-500 sm:px-6">Pr. måned</td><td className="px-3 pb-4 text-right text-[14px] text-slate-600">{signed(cf / 12)}</td><td className="px-5 pb-4 text-right text-[14px] text-slate-600 sm:px-6">{signed(prudentCf / 12)}</td></tr>
              </tbody>
            </table>
            <p className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-[13px] leading-relaxed text-slate-600 sm:px-6">
              {b.rentSource === "skøn"
                ? "Annoncen oplyser kun afkastet. Lejeindtægt og driftsudgifter er fordelt med et skøn, indtil driftsbudgettet er indtastet."
                : "Driftsresultatet er sælgers: afkast × købspris. Lejeindtægten er driftsresultat plus sælgers driftsudgifter."}{" "}
              Tillæggene er NordInvests forsigtige skøn og kan rettes. Egenkapital: {kr(r.cashInvested)}. Lån: {kr(r.loan)}.
            </p>
          </div>

          <div className="space-y-6">
            <div className={`${card} p-5 sm:p-6`}>
              <p className="text-[17px] text-slate-800">
                Nettoafkast på sælgers tal: <b className={`font-semibold tabular-nums ${yieldTone === "good" ? "text-emerald-700" : "text-amber-700"}`}>{pct1(r.capRate)}</b>. Forsigtigt: <b className="font-semibold tabular-nums text-slate-900">{pct1((b.prudentNoi / price) * 100)}</b>.
              </p>
              <p className="mt-1 text-[15px] text-slate-600">Det normale niveau for {typeName} er {pct1(band.goodLo)} til {pct1(band.goodHi)}.</p>
              <YieldScale value={r.capRate} band={band} />
              <p className="mt-3 text-[15px] text-slate-600">{yieldNote}</p>
            </div>
            <button type="button" onClick={onAdjust} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-900 hover:border-slate-400 active:translate-y-px">
              <SlidersHorizontal size={18} strokeWidth={1.8} /> Ret driftsbudget, udbetaling og rente
            </button>
          </div>
        </div>
      </Part>

      {/* 1b. Checked against the public record */}
      {dossier && (
        <Part id="registre" q="Tjek mod offentlige registre" tone={found.some((x) => x.tone === "bad") ? "bad" : found.some((x) => x.tone === "warn") ? "warn" : "good"}
          a={found.filter((x) => x.tone === "bad" || x.tone === "warn").length
            ? `${found.filter((x) => x.tone === "bad" || x.tone === "warn").length} forhold skal undersøges nærmere, før tallene kan bruges.`
            : "Sælgers tal hænger sammen med BBR, den offentlige vurdering og kommunens grundskyld."}>
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
            <ul className={`${card} divide-y divide-slate-100`}>
              {found.map((x) => <FindingRow key={x.title} f={x} />)}
            </ul>
            <div className={`${card} p-5 sm:p-6`}>
              <p className="text-[16px] font-semibold text-slate-900">Ejendommen i BBR</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
                {dossier.units && <><dt className="text-slate-500">Boliger</dt><dd className="text-right tabular-nums text-slate-900">{dossier.units.residential} · {dossier.units.residentialArea.toLocaleString("da-DK")} m²</dd></>}
                {dossier.units && dossier.units.flats.length > 0 && <><dt className="text-slate-500">Boligstørrelser</dt><dd className="text-right tabular-nums text-slate-900">{dossier.units.flats.join(", ")} m²</dd></>}
                {dossier.units && <><dt className="text-slate-500">Erhverv</dt><dd className="text-right tabular-nums text-slate-900">{dossier.units.commercial} · {dossier.units.commercialArea.toLocaleString("da-DK")} m²</dd></>}
                {dossier.building?.builtYear && <><dt className="text-slate-500">Opført</dt><dd className="text-right tabular-nums text-slate-900">{dossier.building.builtYear}{dossier.building.renovatedYear ? `, ombygget ${dossier.building.renovatedYear}` : ""}</dd></>}
                {dossier.building?.floors && <><dt className="text-slate-500">Etager</dt><dd className="text-right tabular-nums text-slate-900">{dossier.building.floors}</dd></>}
                {dossier.building?.roof && <><dt className="text-slate-500">Tag</dt><dd className="text-right text-slate-900">{dossier.building.roof}</dd></>}
                {dossier.building?.wall && <><dt className="text-slate-500">Ydervægge</dt><dd className="text-right text-slate-900">{dossier.building.wall}</dd></>}
                {dossier.building?.heating && <><dt className="text-slate-500">Varme</dt><dd className="text-right text-slate-900">{dossier.building.heating}{dossier.building.fuel ? `, ${dossier.building.fuel.toLowerCase()}` : ""}</dd></>}
                {dossier.valuation?.propertyValue && <><dt className="text-slate-500">Ejendomsværdi</dt><dd className="text-right tabular-nums text-slate-900">{kr(dossier.valuation.propertyValue)} ({dossier.valuation.year})</dd></>}
                {dossier.valuation?.landValue && <><dt className="text-slate-500">Grundværdi</dt><dd className="text-right tabular-nums text-slate-900">{kr(dossier.valuation.landValue)}</dd></>}
                {dossier.landTax && <><dt className="text-slate-500">Grundskyld (skøn)</dt><dd className="text-right tabular-nums text-slate-900">{kr(dossier.landTax.annual)} om året</dd></>}
              </dl>
              <p className="mt-4 text-[13px] leading-relaxed text-slate-500">Kilder: BBR og Ejendomsvurderingen via Datafordeler, grundskyldspromille fra Danmarks Statistik (PSKAT). Grundskyld er skønnet som 80 % af grundværdien gange promillen. Den faktiske kan være lavere pga. grundskatteloftet, og erhverv kan betale dækningsafgift. BFE {dossier.bfe}.</p>
            </div>
          </div>
        </Part>
      )}

      {/* 2. What today's operation can take */}
      <Part id="risici" q="Hvad kan driften tåle?" tone={st.tolerancePct >= 30 ? "good" : st.tolerancePct > 0 ? "warn" : "bad"}
        a={st.tolerancePct > 0
          ? `Driftsresultatet kan falde ${pct1(st.tolerancePct)} (${kr(st.toleranceKr)} om året), før cash flow er nul. Det er målt på i dag, uden at fremskrive noget.`
          : "Driftsresultatet dækker ikke ydelsen i dag. Prisen, udbetalingen eller driften skal ændres, før tallene hænger sammen."}>
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          <div className={`${card} p-5 sm:p-6`}>
            <p className="text-[16px] font-semibold text-slate-900">Cash flow i år 1, hvis driften bliver dårligere end budgettet</p>
            <ul className="mt-4 space-y-3">
              {st.rows.map((x, i) => (
                <li key={x.label} className={i === st.rows.length - 1 ? "border-t border-slate-200 pt-3" : ""}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-[15px] font-medium text-slate-900">{x.label}</span>
                    <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${x.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(x.cashFlow)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="min-w-0 flex-1 text-[13px] text-slate-500">{x.note}</span>
                    <span className="relative h-2 w-28 shrink-0 overflow-hidden rounded-full bg-slate-100 sm:w-40" aria-hidden>
                      <span className={`absolute inset-y-0 ${x.cashFlow >= 0 ? "left-1/2 bg-emerald-500" : "right-1/2 bg-rose-500"}`} style={{ width: `${(Math.abs(x.cashFlow) / maxAbs) * 50}%` }} />
                      <span className="absolute inset-y-0 left-1/2 w-px bg-slate-400" />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[14px] text-slate-600">{worst.cashFlow >= 0 ? "Selv med alt på én gang er cash flow positivt." : `Rammer det hele på én gang, er cash flow ${signed(worst.cashFlow)} om året.`}</p>
          </div>
          <div className={`${card} p-5 sm:p-6`}>
            <p className="text-[16px] font-semibold text-slate-900">Renten</p>
            <table className="mt-3 w-full text-[16px]">
              <thead><tr className="text-left text-[13px] text-slate-500"><th className="pb-2 font-medium">Rente</th><th className="pb-2 text-right font-medium">Cash flow pr. md.</th></tr></thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {rateRows.map((x) => (
                  <tr key={x.at} className={x.today ? "bg-slate-50" : ""}>
                    <td className="py-2.5 pl-1 text-slate-700">{pct2(x.at)}{x.today && <span className="ml-2 text-[13px] text-slate-500">valgt</span>}</td>
                    <td className={`py-2.5 pr-1 text-right font-semibold ${x.cf >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(x.cf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{r.breakEvenRate > base ? `Break-even-renten er ${pct1(r.breakEvenRate)} på sælgers budget.` : "Driftsresultatet dækker ikke ydelsen ved den valgte rente."} Erhvervslån har ofte variabel rente.</p>
          </div>
        </div>
      </Part>

      {/* 3. Scenarios, not a forecast */}
      <Part id="fremtid" tint q="Tre scenarier over 10 år" tone="neutral"
        a="Ikke en prognose. Tre sæt forudsætninger side om side, hvor driftsudgifterne stiger mindst lige så hurtigt som lejen. Brug dem til at se, hvad udfaldet afhænger af.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[15px] tabular-nums">
            <caption className="sr-only">Tre scenarier over 10 år</caption>
            <thead>
              <tr className="border-b-2 border-[var(--color-ink)] text-left">
                <th className="py-2 pr-4 font-normal text-[var(--color-muted)]">Over 10 år</th>
                {sc.map((s) => <th key={s.id} className="py-2 pl-4 text-right font-semibold text-[var(--color-ink)]">{s.label}{s.id === "forsigtig" && <span className="block text-[12px] font-normal text-[var(--color-muted)]">udgangspunkt</span>}</th>)}
              </tr>
            </thead>
            <tbody>
              {([
                ["Leje pr. år", (s) => `${s.rentGrowth > 0 ? "+" : ""}${pct1(s.rentGrowth)}`, false],
                ["Driftsudgifter pr. år", (s) => `+${pct1(s.opexGrowth)}`, false],
                ["Værdi pr. år", (s) => `${s.valueGrowth > 0 ? "+" : ""}${pct1(s.valueGrowth)}`, false],
                ["Forsigtige tillæg", (s) => (s.prudent ? "med" : "uden"), false],
                ["Cash flow år 1", (s) => signed(s.cashFlowY1), true],
                ["Cash flow år 10", (s) => signed(s.cashFlowY10), true],
                ["Cash flow i alt", (s) => signed(s.cumulative), true],
                ["Afdrag på lån", (s) => signed(s.paidDown), false],
                ["Værdiændring", (s) => signed(s.valueChange), false],
                ["Købs- og salgsomkostninger", (s) => signed(-(s.buyCosts + s.saleCosts)), false],
              ] as [string, (s: (typeof sc)[number]) => string, boolean][]).map(([k, f, money], ri) => (
                <tr key={k} className={`border-b border-[var(--color-rule)] ${ri === 4 ? "border-t-2 border-t-[var(--color-ink)]" : ""}`}>
                  <th scope="row" className="py-2 pr-4 text-left font-normal text-[var(--color-ink-2)]">{k}</th>
                  {sc.map((s) => <td key={s.id} className={`py-2 pl-4 text-right ${money && f(s).startsWith("−") ? "text-rose-700" : "text-[var(--color-ink)]"}`}>{f(s)}</td>)}
                </tr>
              ))}
              <tr className="border-b-2 border-[var(--color-ink)]">
                <th scope="row" className="py-3 pr-4 text-left font-semibold text-[var(--color-ink)]">Gevinst før skat</th>
                {sc.map((s) => <td key={s.id} className={`py-3 pl-4 text-right text-[16px] font-semibold ${s.total >= 0 ? "text-emerald-800" : "text-rose-700"}`}>{s.total >= 1e6 || s.total <= -1e6 ? `${s.total >= 0 ? "+" : "−"}${mio(Math.abs(s.total))}` : signed(s.total)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-5 max-w-[80ch] text-[14px] leading-relaxed text-slate-600">
          {oldResidential ? "I det forsigtige scenarie stiger lejen ikke, fordi lejen i ejendomme taget i brug før 1992 typisk er omkostningsbestemt og kun kan hæves efter lejelovens regler. " : ""}
          Alle scenarier har uændret rente og forudsætter, at lejerne bliver. Gevinsten er summen af cash flow, afdrag og værdiændring minus købs- og salgsomkostninger, før skat. Vedligeholdelsestillægget stiger med driftsudgifterne.
        </p>
      </Part>

      {/* 4. Checks */}
      <Part id="tjek" q="Tjekliste før bud" tone="neutral" a="Det skal være gennemgået, før tallene kan bruges til et bud eller en indstilling.">
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

      {/* 5. What the numbers rest on, and who stands behind them */}
      <Part id="data" tint q="Datagrundlag" tone="neutral" a="Hvad hvert tal bygger på, og hvad der mangler, før analysen kan bruges professionelt.">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <ul className={`${card} divide-y divide-slate-100`}>
            {dq.items.map((i) => (
              <li key={i.label} className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${i.ok ? "bg-emerald-500 text-white" : "border-2 border-slate-300"}`}>{i.ok && <Check size={12} strokeWidth={3} />}</span>
                <span className="min-w-0"><span className="block text-[16px] font-medium text-slate-900">{i.label}</span><span className="block text-[14px] text-slate-600">{i.note}</span></span>
              </li>
            ))}
          </ul>
          <div className="min-w-0 space-y-6">{trust}</div>
        </div>
        <div className="mt-6"><FounderNote /></div>
      </Part>
    </>
  );
}

const TONE: Record<Finding["tone"], { dot: string; text: string }> = {
  good: { dot: "bg-emerald-500", text: "text-emerald-800" },
  info: { dot: "bg-blue-500", text: "text-slate-900" },
  warn: { dot: "bg-amber-500", text: "text-amber-900" },
  bad: { dot: "bg-rose-500", text: "text-rose-800" },
};
function FindingRow({ f }: { f: Finding }) {
  return (
    <li className="flex gap-3 px-5 py-4 sm:px-6">
      <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${TONE[f.tone].dot}`} aria-hidden />
      <span className="min-w-0"><span className={`block text-[16px] font-semibold ${TONE[f.tone].text}`}>{f.title}</span><span className="mt-0.5 block text-[14px] leading-relaxed text-slate-600">{f.note}</span></span>
    </li>
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
