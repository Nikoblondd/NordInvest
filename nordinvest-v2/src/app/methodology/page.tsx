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
