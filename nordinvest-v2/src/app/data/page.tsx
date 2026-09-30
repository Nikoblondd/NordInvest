import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { reference, REGION_LABEL, TYPE_LABEL } from "@/lib/reference";

export const metadata: Metadata = {
  title: "Datagrundlag: markedsdata bag hver analyse",
  description:
    "Åbent datagrundlag: medianpris pr. m² pr. landsdel og boligtype samt erhvervsnøgletal fra vores løbende markedsindsamling, med kilde og dato på hvert tal.",
  alternates: { canonical: "https://nordinvest.io/data" },
};

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

export default function DataPage() {
  const r = reference;

  const resRegions = Object.entries(r.residential.byRegion).sort((a, b) => b[1].value - a[1].value);
  const resTypes = Object.entries(r.residential.byType).sort((a, b) => b[1].value - a[1].value);
  const commRegions = Object.entries(r.commercial.byRegion).sort((a, b) => b[1].priceM2 - a[1].priceM2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "NordInvest markedsdatagrundlag",
    description: metadata.description,
    creator: { "@type": "Organization", name: "NordInvest" },
    dateModified: r.asOf,
    isAccessibleForFree: true,
    variableMeasured: ["Medianpris pr. m²", "Erhvervsafkast", "Ejerudgift pr. m²"],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <section className="px-6 pt-16 sm:pt-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Åbent datagrundlag</p>
          <h1 className="mt-4 text-[2rem] font-bold leading-[1.12] tracking-tight [hyphens:auto] sm:text-5xl">
            Dataet bag hver analyse
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Vores mål er at dokumentere så mange tal som muligt. En uafhængig datamotor indsamler
            løbende hele det danske udbudsmarked og udleder de benchmarks, analysen bruger. Her
            offentliggør vi dem — med kilde, dato og antal annoncer bag hvert tal.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600">
              Opdateret {r.asOf}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600">
              {dk(r.totals.bolig)} boligannoncer
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600">
              {dk(r.totals.erhverv)} erhvervsannoncer
            </span>
          </div>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-4xl space-y-14">
          {/* residential price/m² by region */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Medianpris pr. m² — boliger</h2>
            <p className="mt-3 text-slate-600">
              Median af udbudspris delt med areal for sammenlignelige investeringsboliger
              (ejerlejlighed, andelsbolig, villalejlighed, rækkehus, villa) pr. landsdel.
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Landsdel</th>
                    <th className="py-2 pr-4 text-right font-semibold">Median kr/m²</th>
                    <th className="py-2 text-right font-semibold">Annoncer</th>
                  </tr>
                </thead>
                <tbody>
                  {resRegions.map(([slug, c]) => (
                    <tr key={slug} className="border-b border-slate-100">
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{REGION_LABEL[slug] ?? slug}</td>
                      <td className="py-2.5 pr-4 text-right tnum text-slate-900">{dk(c.value)}</td>
                      <td className="py-2.5 text-right tnum text-slate-500">{dk(c.n)}</td>
                    </tr>
                  ))}
                  {r.residential.national && (
                    <tr className="border-t-2 border-slate-200 font-semibold">
                      <td className="py-2.5 pr-4 text-slate-900">Hele landet</td>
                      <td className="py-2.5 pr-4 text-right tnum text-slate-900">{dk(r.residential.national.value)}</td>
                      <td className="py-2.5 text-right tnum text-slate-500">{dk(r.residential.national.n)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* residential by type */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Medianpris pr. m² — efter boligtype</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Boligtype</th>
                    <th className="py-2 pr-4 text-right font-semibold">Median kr/m²</th>
                    <th className="py-2 text-right font-semibold">Annoncer</th>
                  </tr>
                </thead>
                <tbody>
                  {resTypes.map(([t, c]) => (
                    <tr key={t} className="border-b border-slate-100">
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{TYPE_LABEL[t] ?? t}</td>
                      <td className="py-2.5 pr-4 text-right tnum text-slate-900">{dk(c.value)}</td>
                      <td className="py-2.5 text-right tnum text-slate-500">{dk(c.n)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* commercial */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Erhverv — pris, drift og afkast</h2>
            <p className="mt-3 text-slate-600">
              Median for udbudte erhvervs- og investeringsejendomme pr. landsdel: pris pr. m²,
              ejerudgift pr. m² pr. måned og annonceret afkast.
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Landsdel</th>
                    <th className="py-2 pr-4 text-right font-semibold">Pris kr/m²</th>
                    <th className="py-2 pr-4 text-right font-semibold">Ejerudgift kr/m²/md.</th>
                    <th className="py-2 pr-4 text-right font-semibold">Afkast</th>
                    <th className="py-2 text-right font-semibold">Annoncer</th>
                  </tr>
                </thead>
                <tbody>
                  {commRegions.map(([code, c]) => (
                    <tr key={code} className="border-b border-slate-100">
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{REGION_LABEL[code] ?? code}</td>
                      <td className="py-2.5 pr-4 text-right tnum text-slate-900">{dk(c.priceM2)}</td>
                      <td className="py-2.5 pr-4 text-right tnum text-slate-700">{c.opexM2 != null ? dk(c.opexM2) : "–"}</td>
                      <td className="py-2.5 pr-4 text-right tnum text-slate-700">{c.returnPct != null ? `${c.returnPct.toLocaleString("da-DK")} %` : "–"}</td>
                      <td className="py-2.5 text-right tnum text-slate-500">{dk(c.n)}</td>
                    </tr>
                  ))}
                  {r.commercial.national && (
                    <tr className="border-t-2 border-slate-200 font-semibold">
                      <td className="py-2.5 pr-4 text-slate-900">Hele landet</td>
                      <td className="py-2.5 pr-4 text-right tnum text-slate-900">{dk(r.commercial.national.priceM2)}</td>
                      <td className="py-2.5 pr-4 text-right tnum text-slate-700">{r.commercial.national.opexM2 != null ? dk(r.commercial.national.opexM2) : "–"}</td>
                      <td className="py-2.5 pr-4 text-right tnum text-slate-700">{r.commercial.national.returnPct != null ? `${r.commercial.national.returnPct.toLocaleString("da-DK")} %` : "–"}</td>
                      <td className="py-2.5 text-right tnum text-slate-500">{dk(r.commercial.national.n)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* commercial rentals — only when the udlejning-scraper has populated
              the reference catalog */}
          {r.commercialRent && Object.keys(r.commercialRent.byRegion).length > 0 && (
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Erhvervsleje — kr/m²/år</h2>
              <p className="mt-3 text-slate-600">
                Median for udbudte erhvervslejemål (kontor, butik, lager) pr. landsdel — fra vores
                løbende indsamling af Ejendomstorvets udlejnings-annoncer.
              </p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2 pr-4 font-semibold">Landsdel</th>
                      <th className="py-2 pr-4 text-right font-semibold">Median kr/m²/år</th>
                      <th className="py-2 text-right font-semibold">Annoncer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(r.commercialRent.byRegion)
                      .sort((a, b) => b[1].value - a[1].value)
                      .map(([code, c]) => (
                        <tr key={code} className="border-b border-slate-100">
                          <td className="py-2.5 pr-4 font-medium text-slate-900">{REGION_LABEL[code] ?? code}</td>
                          <td className="py-2.5 pr-4 text-right tnum text-slate-900">{dk(c.value)}</td>
                          <td className="py-2.5 text-right tnum text-slate-500">{dk(c.n)}</td>
                        </tr>
                      ))}
                    {r.commercialRent.national && (
                      <tr className="border-t-2 border-slate-200 font-semibold">
                        <td className="py-2.5 pr-4 text-slate-900">Hele landet</td>
                        <td className="py-2.5 pr-4 text-right tnum text-slate-900">{dk(r.commercialRent.national.value)}</td>
                        <td className="py-2.5 text-right tnum text-slate-500">{dk(r.commercialRent.national.n)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* other documented sources */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Øvrige dokumenterede kilder</h2>
            <ul className="mt-4 space-y-3">
              <li className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span>
                  <b>Bygningsdata</b> (byggeår, areal, værelser, opvarmning) — Bygnings- og Boligregistret (BBR) via{" "}
                  <a href="https://datafordeler.dk" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-900">Datafordeler</a>
                  , pr. adresse. Licens:{" "}
                  <a href="https://creativecommons.org/licenses/by/4.0/deed.da" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-900">CC BY 4.0</a>.
                </span>
              </li>
              <li className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span><b>Værdistigning</b> — Danmarks Statistik (EJ55, prisindeks for ejendomssalg), realiserede salgspriser pr. landsdel og ejendomstype.</span>
              </li>
              <li className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span>
                  <b>Markedsleje (huslejeindeks)</b> — Danmarks Statistik (HUS1, huslejeindeks for private boliger), pr. region og kvartal.
                  Bruges til at anker og fremskrive vores per-region baseline pr. m² automatisk.
                </span>
              </li>
              <li className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span>
                  <b>Bruger-observationer</b> — anonymiserede lejeoplysninger, som brugerne
                  frivilligt indtaster efter en analyse. Aggregeres pr. region + type. Ved
                  ≥15 observationer overlaies data på den officielle baseline, og lejen flippes
                  fra Kalibreret til Dokumenteret.
                </span>
              </li>
            </ul>
          </div>

          {/* honest limits */}
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7">
            <h2 className="text-xl font-bold text-amber-900">Hvad vi endnu ikke fuldt kan dokumentere</h2>
            <div className="mt-3 space-y-3 text-amber-900/90">
              <p>
                <b>Faktisk husleje pr. m² pr. bolig.</b> Der findes ingen fri kilde til den konkrete
                indgåede leje pr. adresse. Vi bruger derfor DST HUS1 (officielt huslejeindeks)
                til at fremskrive vores per-region baseline pr. kvartal, og aggregerer bruger-
                observationer på toppen. Ved ≥15 observationer i et område flippes lejen fra
                Kalibreret til Dokumenteret. Annonceret leje er desuden ikke altid den lovlige
                leje — se <Link href="/methodology" className="underline">metoden</Link>.
              </p>
              <p>
                <b>Ejerudgift på boliger.</b> Boligannoncernes aggregerede data indeholder sjældent
                ejerudgiften, så den mærkes som estimat, medmindre den står i den konkrete annonce.
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Kilde: {r.source}. Genereret {r.generatedAt.slice(0, 10)}. Tallene er medianer af udbudte
            (annoncerede) priser — ikke realiserede handelspriser eller en vurdering af den enkelte ejendom.
          </p>

          <div className="rounded-3xl bg-slate-900 p-8 text-white md:p-10">
            <h2 className="text-2xl font-bold tracking-tight">Se dataet i en analyse</h2>
            <p className="mt-3 max-w-xl text-slate-300">
              Kør en analyse og se markedsprisen pr. m² sammenlignet med din bolig — med kilde og dato.
            </p>
            <Link href="/analyseren" className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Åbn analyseren →
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
