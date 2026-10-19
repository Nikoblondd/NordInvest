import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { PropertyImage } from "@/components/app/PropertyImage";
import { Faq } from "@/components/landing/Faq";
import { AccessBand, JsonLd, PublicShell, breadcrumbLd, faqLd } from "@/components/public/PublicShell";
import { getInvestmentMarket, type MarketRow } from "@/lib/investment-market";
import { site } from "@/lib/site";

// Live market data, rebuilt every 6 hours (cached), so the page renders per request.
export const dynamic = "force-dynamic";

const PATH = "/udlejningsejendomme-til-salg";
const TITLE = "Udlejnings- og erhvervsejendomme til salg nu";
const DESCRIPTION = "Alle udlejnings- og erhvervsejendomme til salg i Danmark regnet igennem: startafkast pr. ejendomstype, cash flow ved 40 % udbetaling og de bedste lige nu.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · NordInvest` },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PATH, images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: TITLE }] },
};

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const mio = (n: number) => `${(n / 1e6).toLocaleString("da-DK", { maximumFractionDigits: 1 })} mio. kr.`;
const pct = (n: number | null) => (n == null ? "–" : `${n.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`);

const FAQ = [
  { q: "Hvad er et godt afkast på en udlejningsejendom?", a: "For danske boligudlejningsejendomme ligger et sundt startafkast typisk omkring 4 til 5,5 %. Et afkast langt over niveauet for ejendomstypen betyder oftest, at prisen afspejler en risiko: tomgang, en enkelt lejer, en svag beliggenhed eller et stort vedligeholdelsesbehov." },
  { q: "Hvordan regner NordInvest ejendommene igennem?", a: "Hver ejendom regnes på det oplyste startafkast og driftsresultat, med 40 % udbetaling og 5 % rente på lånet, fordi erhvervsejendomme sjældent belånes med mere end 60 %. Det giver cash flow pr. måned, gældsdækning (DSCR) og en score fra 0 til 100, der også vurderer afkastet mod det normale niveau for ejendomstypen." },
  { q: "Hvor kommer ejendommene fra?", a: "Fra Ejendomstorvet, hvor mæglere annoncerer erhvervs- og investeringsejendomme. Listen opdateres hver 6. time." },
  { q: "Kan jeg få en fuld analyse af en bestemt ejendom?", a: "Ja. I NordInvest regner du en ejendom igennem med rentestress, 10-årsfremskrivning og bankrapport, og du kan oprette en søgeagent, der giver besked, når en ny ejendom passer dine krav." },
];

function Listing({ r }: { r: MarketRow }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-3">
      <span className="h-[88px] w-[118px] shrink-0 overflow-hidden rounded-xl bg-slate-50"><PropertyImage src={r.image} alt={`${r.road}, ${r.zip} ${r.city}`} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-slate-900">{r.road || r.title}</p>
            <p className="truncate text-[13px] text-slate-500">{r.zip} {r.city}{r.subcategory ? ` · ${r.subcategory}` : ""}{r.area ? ` · ${r.area.toLocaleString("da-DK")} m²` : ""}</p>
          </div>
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-bold tabular-nums ${r.score >= 65 ? "bg-emerald-50 text-emerald-700" : r.score >= 45 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"}`}>{r.score}</span>
        </div>
        <p className="mt-1 flex flex-wrap gap-x-3 text-[14px]">
          <b className="font-semibold tabular-nums">{kr(r.price)}</b>
          <span className="tabular-nums text-slate-600">Afkast {pct(r.capRate)}</span>
          <span className={`font-semibold tabular-nums ${r.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{r.cashFlow >= 0 ? "+" : "-"}{Math.abs(Math.round(r.cashFlow)).toLocaleString("da-DK")} kr./md.</span>
        </p>
        {r.url && <a href={r.url} target="_blank" rel="noopener nofollow" className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-blue-700 hover:underline">Se annoncen <ExternalLink size={12} /></a>}
      </div>
    </li>
  );
}

export default async function Page() {
  const m = await getInvestmentMarket();
  const crumbs = [{ href: "/deals", label: "Deal-motor" }, { href: PATH, label: "Udlejningsejendomme til salg" }];
  const updated = m ? new Date(m.updated).toLocaleString("da-DK", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }) : null;
  const rentalType = m?.types.find((t) => t.name === "Boligudlejning");
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${site.url}${PATH}#webpage`, url: `${site.url}${PATH}`, name: TITLE, description: DESCRIPTION, inLanguage: "da-DK", isPartOf: { "@id": `${site.url}/#website` }, ...(m ? { dateModified: m.updated } : {}) },
      ...(m ? [{
        "@type": "Dataset",
        name: "Startafkast for udlejnings- og erhvervsejendomme til salg i Danmark",
        description: `Medianafkast og antal ejendomme til salg pr. ejendomstype, beregnet af NordInvest ud fra ${m.total} annoncer på Ejendomstorvet.`,
        creator: { "@id": `${site.url}/#organization` },
        dateModified: m.updated,
        spatialCoverage: "Danmark",
        variableMeasured: ["Startafkast (nettoafkast)", "Antal ejendomme til salg", "Medianpris"],
        isAccessibleForFree: true,
      }, { "@type": "ItemList", name: "De bedste udlejnings- og erhvervsejendomme til salg lige nu", itemListElement: m.top.slice(0, 10).map((r, i) => ({ "@type": "ListItem", position: i + 1, name: `${r.road || r.title}, ${r.zip} ${r.city}`, url: r.url })) }] : []),
      breadcrumbLd(crumbs),
      faqLd(FAQ),
    ],
  };
  return (
    <PublicShell crumbs={crumbs}>
      <JsonLd data={ld} />
      <section className="mx-auto max-w-[1180px] px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <h1 className="max-w-3xl text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] text-[#17213a] [text-wrap:balance] sm:text-[46px]">Udlejningsejendomme og erhvervsejendomme til salg</h1>
        <p className="mt-5 max-w-3xl text-[18px] leading-relaxed text-slate-600">
          {m ? <>Lige nu er der <b className="text-slate-900">{m.total.toLocaleString("da-DK")} investerings- og erhvervsejendomme</b> til salg i Danmark. Vi har regnet dem alle igennem med 40 % udbetaling og 5 % rente{rentalType?.medianYield != null ? <>, og medianafkastet for boligudlejningsejendomme er <b className="text-slate-900">{pct(rentalType.medianYield)}</b></> : null}.</> : "Markedsdata opdateres. Kig igen om lidt."}
        </p>
        {updated && <p className="mt-2 text-[13px] text-slate-500">Opdateret {updated}. Kilde: annoncer på Ejendomstorvet, beregnet af NordInvest.</p>}
      </section>

      {m && (
        <>
          <section className="mx-auto max-w-[1180px] px-4 pb-14 sm:px-6 lg:px-8">
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-[#17213a] sm:text-[32px]">Afkast pr. ejendomstype</h2>
            <p className="mt-2 max-w-3xl text-[16px] text-slate-600">Medianen af det oplyste startafkast for ejendommene til salg, holdt op mod det niveau, der normalt er sundt for typen. Et afkast langt over niveauet betyder oftest en risiko i prisen.</p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[620px] text-left text-[15px]">
                <thead className="bg-slate-50 text-[13px] font-semibold text-slate-600"><tr><th className="px-4 py-3">Ejendomstype</th><th className="px-4 py-3 text-right">Til salg</th><th className="px-4 py-3 text-right">Medianafkast</th><th className="px-4 py-3 text-right">Normalt niveau</th><th className="px-4 py-3 text-right">Medianpris</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {m.types.map((t) => (
                    <tr key={t.name}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{t.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{t.count.toLocaleString("da-DK")}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{pct(t.medianYield)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{pct(t.band.goodLo)} til {pct(t.band.goodHi)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{t.medianPrice ? mio(t.medianPrice) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-2">
              <div className="min-w-0">
                <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#17213a] sm:text-[28px]">Boligudlejningsejendomme med højest score</h2>
                <ul className="mt-5 space-y-3">{m.rental.slice(0, 8).map((r) => <Listing key={r.url || r.road} r={r} />)}</ul>
              </div>
              <div className="min-w-0">
                <h2 className="text-[24px] font-semibold tracking-[-0.02em] text-[#17213a] sm:text-[28px]">Alle erhvervstyper: højest score</h2>
                <ul className="mt-5 space-y-3">{m.top.slice(0, 8).map((r) => <Listing key={r.url || r.road} r={r} />)}</ul>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-[#17213a] sm:text-[32px]">Hvor ligger ejendommene?</h2>
            <p className="mt-2 text-[16px] text-slate-600">De kommuner med flest investerings- og erhvervsejendomme til salg lige nu.</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {m.kommuner.map((k) => (
                <li key={k.slug} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                  <Link href={`/deals/${k.slug}`} className="font-medium text-slate-900 hover:text-blue-700">{k.name}</Link>
                  <span className="text-[14px] tabular-nums text-slate-600">{k.count} til salg · {pct(k.medianYield)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="bg-slate-50 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-[#17213a] sm:text-[32px]">Sådan vurderer du en udlejningsejendom</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-slate-700">
              <p>Startafkastet i annoncen er driftsresultatet delt med prisen. Det er et godt første filter, men det siger intet om lånet. Regn derfor altid cash flow efter ydelse og se, hvor høj renten kan blive, før ejendommen ikke længere betaler sig selv.</p>
              <p>Læs lejekontrakterne og driftsbudgettet: hvornår kan lejen reguleres, hvor stor er tomgangen, og er vedligeholdelsen budgetteret realistisk? For boliger taget i brug før 1992 kan lejen være omfattet af omkostningsbestemt leje, hvilket begrænser, hvad du kan hæve den til.</p>
              <p>Sammenlign til sidst afkastet med det normale niveau for typen og beliggenheden. Et højt afkast i en mindre by er ikke nødvendigvis bedre end et lavere i en storby med stabil efterspørgsel.</p>
            </div>
            <div className="mt-8"><Faq items={FAQ} /></div>
          </div>
          <aside className="space-y-3">
            <div className="rounded-2xl bg-[#17213a] p-5 text-white">
              <p className="text-[16px] font-semibold">Få besked om nye ejendomme</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">En søgeagent holder øje med erhvervsmarkedet med dine krav til type, område og afkast og giver besked på mail.</p>
              <Link href="/funktioner/soegeagent" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-blue-300 hover:underline">Om søgeagenter <ArrowRight size={14} /></Link>
            </div>
            <Link href="/deals" className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300"><span className="block font-semibold text-slate-900">De bedste boliginvesteringer</span><span className="text-[14px] text-slate-600">Ejerlejligheder og huse rangeret af Deal-motoren.</span></Link>
            <Link href="/analyse-af-ejendomsinvestering" className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300"><span className="block font-semibold text-slate-900">Guide: regn en investering igennem</span><span className="text-[14px] text-slate-600">Cash flow, afkast, lån, drift og rentestress.</span></Link>
            <Link href="/blog/godt-afkast-udlejningsejendom" className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300"><span className="block font-semibold text-slate-900">Hvad er et godt afkast?</span><span className="text-[14px] text-slate-600">Medianafkast efter type, pris og kommune.</span></Link>
            <Link href="/blog/erhvervsejendom-som-investering" className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300"><span className="block font-semibold text-slate-900">Erhvervsejendom som investering</span><span className="text-[14px] text-slate-600">Butik, kontor og lager: afkast og risici.</span></Link>
          </aside>
        </div>
      </section>
      <AccessBand />
    </PublicShell>
  );
}
