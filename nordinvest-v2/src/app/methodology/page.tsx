import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Metode og datakilder bag analyserne",
  description:
    "Sådan regner NordInvest: markedsdata fra Danmarks Statistik, SCB og SSB, BBR-data og boligannoncer, et konfidensmærke på hvert tal og en åben metode.",
  alternates: { canonical: "https://nordinvest.io/methodology" },
};

const SOURCES = [
  { code: "DK", country: "Danmark", src: "Danmarks Statistik (DST)", desc: "Gennemsnitlig realiseret salgspris pr. m² efter kommune for ejerlejligheder. Landsdækkende værdistigningstakter udledes af samme dataserie." },
  { code: "SE", country: "Sverige", src: "Statistiska centralbyrån (SCB)", desc: "Gennemsnitlig salgspris pr. m² efter län og større kommuner. Den gratis serie for leje pr. m² på kommuneniveau er begrænset, så lejetal kan være utilgængelige i mange områder." },
  { code: "NO", country: "Norge", src: "Statistisk sentralbyrå (SSB)", desc: "Gennemsnitlig salgspris pr. m² efter kommune. Værdistigningstakter udledes af SSB's offentliggjorte boligprisindeks." },
];

const NOTDO = [
  "Scraper Boliga, Hemnet, Finn.no eller andre annonceportaler — de datasæt bryder ofte brugsvilkårene og går i stykker.",
  "Opfinder leje pr. m² ved at udlede den af “typisk områdeafkast × salgspris”.",
  "Citerer en kilde uden et fungerende link.",
  "Viser et tal uden et konfidensmærke.",
];

export default function MethodologyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Sådan finder vi vores markedsdata",
    description: metadata.description,
    author: { "@type": "Organization", name: "NordInvest" },
    publisher: { "@type": "Organization", name: "NordInvest" },
    mainEntityOfPage: "https://nordinvest.io/methodology",
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <section className="px-6 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Metode</p>
          <h1 className="mt-4 text-[2rem] font-bold leading-[1.12] tracking-tight [hyphens:auto] sm:text-5xl">
            Sådan finder vi vores markedsdata
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            NordInvest henter markedsdata direkte fra de officielle statistikbureauer i Danmark,
            Sverige og Norge — ikke fra scraping. Hvert tal bærer et konfidensmærke, så du altid ved,
            hvor sikkert det er.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Hvor tallene kommer fra</h2>
            <div className="mt-5 space-y-4">
              {SOURCES.map((s) => (
                <div key={s.country} className="flex gap-5 rounded-2xl border border-slate-200/80 bg-white p-6 card-highlight">
                  {/* Small typographic country tag — the kind of considered detail
                      a designer would pick over an emoji flag. */}
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-7 shrink-0 items-center justify-center rounded-md bg-slate-900 px-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-white"
                  >
                    {s.code}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">{s.country} · {s.src}</h3>
                    <p className="mt-2 leading-relaxed text-slate-600">{s.desc}</p>
                  </div>
                </div>
              ))}
              {/* Bygningsdata (BBR) sits at the address level — every Danish
                  analysis pulls byggeår, areal, værelser og opvarmning fra det
                  offentlige register via Datafordeler. CC BY 4.0 kræver
                  synlig kildeangivelse + licenshenvisning. */}
              <div className="flex gap-5 rounded-2xl border border-slate-200/80 bg-white p-6 card-highlight">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-7 shrink-0 items-center justify-center rounded-md bg-slate-900 px-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-white"
                >
                  DK
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">Danmark · Bygnings- og Boligregistret (BBR)</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">
                    Officielle bygningsdata pr. adresse — byggeår, areal, værelser, opvarmning, ydervæg, tag — hentes fra{" "}
                    <a href="https://datafordeler.dk" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Datafordeler</a>
                    . Data er offentliggjort under licensen{" "}
                    <a href="https://creativecommons.org/licenses/by/4.0/deed.da" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">CC BY 4.0</a>
                    , og krediteres på hver analyse, der bruger dem.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Hvert tal er mærket</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">
              I analysen mærker vi hvert tal, der bærer vurderingen, med ét af tre niveauer, så du
              aldrig er i tvivl om, hvor sikkert det er:
            </p>
            <ul className="mt-4 space-y-3">
              <li className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span><b className="text-emerald-800">Dokumenteret</b> — hentet direkte fra annoncen, fra BBR eller indtastet af dig selv.</span>
              </li>
              <li className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                <span><b className="text-amber-800">Estimat</b> — beregnet af os (fx leje ud fra areal og lokalt lejeniveau) og tydeligt markeret. Du kan altid overskrive det med dit eget tal.</span>
              </li>
              <li className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
                <span><b className="text-slate-700">Skal undersøges</b> — forhold vi ikke kan afgøre for dig, fx om lejen er lovlig. Vi flager det tydeligt frem for at give en falsk-sikker vurdering.</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Sådan finder vi lejen</h2>
            <div className="mt-4 space-y-4 text-lg leading-relaxed text-slate-700">
              <p>
                Salgsprisdata pr. kommune er godt offentliggjort i hele Norden. Direkte lejetal pr. m²
                er det ikke — Danmarks lejeserie er et <em>indeks</em>, ikke et prisniveau, og Sverige
                og Norge offentliggør lignende indeks.
              </p>
              <p>
                Står lejen i annoncen, bruger vi den (mærket <b>Dokumenteret</b>). Gør den ikke, viser
                vi ikke “Ikke tilgængelig” og efterlader dig med tomme felter — vi beregner et
                kvalificeret <b>Estimat</b> ud fra ejendommens areal og det lokale lejeniveau, mærker
                det tydeligt som et estimat, og lader dig overskrive det med dine egne tal. Vi
                fabrikerer aldrig et tal og udgiver det som en kendsgerning.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Annonceret leje er ikke altid lovlig leje</h2>
            <div className="mt-4 space-y-4 text-lg leading-relaxed text-slate-700">
              <p>
                En annonceret husleje er et udbud — ikke nødvendigvis den leje, du lovligt må opkræve.
                Dansk lejefastsættelse rummer flere regelsæt, og ejendomme taget i brug før 1992 kan
                være omfattet af omkostningsbestemt leje i regulerede kommuner, hvor den lovlige leje
                kan ligge under den annoncerede.
              </p>
              <p>
                Derfor viser analysen en advarsel, når vurderingen hviler på en annonceret eller
                estimeret leje, og beder dig få lejefastsættelsen bekræftet — for lejen bærer hele
                afkastet. Se{" "}
                <a
                  href="https://www.retsinformation.dk/eli/lta/2022/341"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  lov om leje
                </a>{" "}
                for de nærmere regler.
              </p>
            </div>
          </div>

          <div id="investeringsejendomme" className="scroll-mt-24">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Investeringsejendomme: sådan regner vi</h2>
            <p className="mt-2 text-[15px] text-slate-500">Beregningsmodel version 2, oktober 2026</p>
            <div className="mt-4 space-y-4 text-lg leading-relaxed text-slate-700">
              <p>
                En udlejningsejendom er kun så god som dens drift, og driften af en ældre ejendom er svær at forudsige.
                Derfor skiller analysen fire ting ad: sælgers tal, NordInvests forsigtige tillæg, hvad driften kan tåle i
                dag, og scenarier for fremtiden. Ingen af delene præsenteres som en prognose.
              </p>
            </div>
            <ol className="mt-6 space-y-4 text-[16px] leading-relaxed text-slate-700">
              <li className="rounded-2xl border border-slate-200 bg-white p-5"><b className="text-slate-900">1. Sælgers driftsbudget, som det er.</b> Driftsresultatet er sælgers afkast gange købsprisen. Lejeindtægten er driftsresultatet plus sælgers oplyste driftsudgifter fra Ejendomstorvet. Hvert tal er mærket med sin kilde: annonce, beregnet, BBR, indtastet eller skøn. Har du lejeliste og regnskab, kan du skrive de faktiske tal ind, og alt regnes om.</li>
              <li className="rounded-2xl border border-slate-200 bg-white p-5"><b className="text-slate-900">2. Forsigtige tillæg, synlige og til at rette.</b> Sælgers budgetter viser sjældent det fulde vedligeholdelsesbehov i ældre bygninger. Analysen trækker derfor et ekstra vedligehold fra efter bygningens opførelsesår i BBR, samt et lejetab i procent af lejen.
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-[15px]">
                    <thead><tr className="text-left text-slate-500"><th className="py-1 font-medium">Opført</th><th className="py-1 text-right font-medium">Bolig, kr./m² om året</th><th className="py-1 text-right font-medium">Erhverv, kr./m² om året</th></tr></thead>
                    <tbody className="tabular-nums">
                      <tr className="border-t border-slate-100"><td className="py-1">Før 1950</td><td className="py-1 text-right">100</td><td className="py-1 text-right">50</td></tr>
                      <tr className="border-t border-slate-100"><td className="py-1">1950-1979</td><td className="py-1 text-right">75</td><td className="py-1 text-right">38</td></tr>
                      <tr className="border-t border-slate-100"><td className="py-1">1980-1999</td><td className="py-1 text-right">50</td><td className="py-1 text-right">25</td></tr>
                      <tr className="border-t border-slate-100"><td className="py-1">2000 og senere</td><td className="py-1 text-right">25</td><td className="py-1 text-right">13</td></tr>
                      <tr className="border-t border-slate-100"><td className="py-1">Ukendt</td><td className="py-1 text-right">75</td><td className="py-1 text-right">38</td></tr>
                    </tbody>
                  </table>
                </div>
                <span className="mt-2 block text-[14px] text-slate-500">Er bygningen ombygget, bruges et år midt mellem opførelse og ombygning. Erhverv får det halve, fordi lejeren ofte har mere af vedligeholdelsen. Lejetab: 2 % for boligudlejning, 3 % for blandet bolig og erhverv og 5 % for rent erhverv.</span>
              </li>
              <li className="rounded-2xl border border-slate-200 bg-white p-5"><b className="text-slate-900">3. Hvad driften kan tåle i dag.</b> Tålegrænsen er, hvor mange procent driftsresultatet kan falde, før cash flow er nul. Den måles på år 1, uden at fremskrive noget. Derudover vises cash flow, hvis vedligeholdelsen, lejetabet, lejen (minus 10 %), driftsudgifterne (plus 20 %) eller renten (plus 2 procentpoint) bliver dårligere end budgettet, og hvis det hele sker på én gang.</li>
              <li className="rounded-2xl border border-slate-200 bg-white p-5"><b className="text-slate-900">4. Tre scenarier, ikke én prognose.</b> I alle tre stiger driftsudgifterne mindst lige så hurtigt som lejen.
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-[15px]">
                    <thead><tr className="text-left text-slate-500"><th className="py-1 font-medium">Pr. år</th><th className="py-1 text-right font-medium">Forsigtig</th><th className="py-1 text-right font-medium">Middel</th><th className="py-1 text-right font-medium">Positiv</th></tr></thead>
                    <tbody className="tabular-nums">
                      <tr className="border-t border-slate-100"><td className="py-1">Leje</td><td className="py-1 text-right">0-1 %</td><td className="py-1 text-right">1,5 %</td><td className="py-1 text-right">2 %</td></tr>
                      <tr className="border-t border-slate-100"><td className="py-1">Driftsudgifter</td><td className="py-1 text-right">3 %</td><td className="py-1 text-right">2,5 %</td><td className="py-1 text-right">2 %</td></tr>
                      <tr className="border-t border-slate-100"><td className="py-1">Ejendommens værdi</td><td className="py-1 text-right">0 %</td><td className="py-1 text-right">1,5 %</td><td className="py-1 text-right">2,5 %</td></tr>
                      <tr className="border-t border-slate-100"><td className="py-1">Forsigtige tillæg</td><td className="py-1 text-right">Med</td><td className="py-1 text-right">Med</td><td className="py-1 text-right">Uden</td></tr>
                    </tbody>
                  </table>
                </div>
                <span className="mt-2 block text-[14px] text-slate-500">Lejen stiger 0 % i det forsigtige scenarie for boligudlejning i ejendomme taget i brug før 1992, fordi lejen typisk er omkostningsbestemt. Uændret rente, købsomkostninger 1,5 % og salgsomkostninger efter mæglersalær. Før skat.</span>
              </li>
              <li className="rounded-2xl border border-slate-200 bg-white p-5"><b className="text-slate-900">5. Hvad der mangler.</b> Analysen viser altid, hvad den ikke bygger på: lejeliste og lejefastsættelse, regnskab for de seneste tre år og en vedligeholdelsesplan eller teknisk gennemgang. Uden dem er analysen en screening, ikke grundlag for et bud eller en indstilling.</li>
            </ol>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Versionslog</h3>
              <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-700">
                <li><b className="text-slate-900">Version 2, oktober 2026.</b> Efter feedback fra en professionel ejendomsinvestor: 10-årsfremskrivningen er erstattet af tre scenarier, hvor udgifterne stiger mindst lige så hurtigt som lejen. Forsigtige tillæg til vedligehold og lejetab efter bygningens alder. Tålegrænse målt på i dag. Kilde på hvert tal. Driftsbudgettet kan rettes med egne tal. I boliganalysens fremskrivning stiger driftsudgifter og vedligehold nu 3 % om året mod lejens 2 %.</li>
                <li><b className="text-slate-900">Oktober 2026.</b> Udbetaling på erhverv sat til 40 % efter feedback fra en erhvervsmægler: bankerne låner sjældent mere end 60 % ud til private købere af erhverv.</li>
                <li><b className="text-slate-900">Version 1, 2026.</b> Driftsresultat fra annoncens afkast og 10-årsfremskrivning med 2 % lejestigning og 3 % værdistigning.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-7">
            <h2 className="text-xl font-bold text-rose-900">Det gør vi ikke</h2>
            <ul className="mt-4 space-y-2 text-rose-900/90">
              {NOTDO.map((x) => (
                <li key={x} className="flex gap-2"><span aria-hidden>✕</span><span>{x}</span></li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Fundet et forkert tal?</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">
              Hvis en offentliggjort statistik i vores datasæt ikke stemmer med den underliggende
              kilde, så skriv til os på{" "}
              <a href="mailto:contact@nordinvest.io" className="text-blue-600 underline">contact@nordinvest.io</a>{" "}
              — vi retter det samme dag. Vores troværdighed afhænger af det.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-8 text-white md:p-10">
            <h2 className="text-2xl font-bold tracking-tight">Prøv analysen</h2>
            <p className="mt-3 max-w-xl text-slate-300">
              Se metoden i praksis: indsæt et boliglink og få en gennemsigtig analyse med kilder og
              konfidensmærker.
            </p>
            <Link href="/analyseren" className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Åbn analyseren →
            </Link>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/data" className="text-blue-300 hover:text-blue-200">Åbent datagrundlag →</Link>
              <Link href="/glossary" className="text-blue-300 hover:text-blue-200">Ordbog →</Link>
              <Link href="/investment-models" className="text-blue-300 hover:text-blue-200">Investeringsstrategier →</Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
