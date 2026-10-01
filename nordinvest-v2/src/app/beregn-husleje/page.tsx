import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RentCalculator } from "@/components/calculators/RentCalculator";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Beregn husleje ved udlejning: lejeberegner · NordInvest" },
  description:
    "Beregn huslejen, når du lejer din lejlighed eller dit hus ud. Få en markedsleje ud fra postnummer og areal, og se hvilke lejeregler der gælder for boligen.",
  alternates: { canonical: "/beregn-husleje" },
};

const FAQ = [
  {
    q: "Hvordan beregner man husleje ved udlejning?",
    a: "Find hvad tilsvarende boliger i området udlejes for pr. m², og gang med boligens areal. En lejlighed på 75 m² i Aarhus C til 130 kr. pr. m² giver ca. 9.800 kr. om måneden. Tjek derefter, om boligen er omfattet af lejeregler, der sætter et loft over lejen.",
  },
  {
    q: "Hvad må jeg tage i husleje for min lejlighed?",
    a: "Udlejer du en enkelt ejerlejlighed eller et hus, må lejen som udgangspunkt ikke være højere end det lejedes værdi: det, tilsvarende boliger i området udlejes for. Boliger i ejendomme taget i brug efter 31. december 1991 kan som hovedregel udlejes til fri leje. I ældre ejendomme i kommuner med huslejeregulering kan lejen være omkostningsbestemt og ligge under markedslejen.",
  },
  {
    q: "Hvor meget depositum må jeg kræve?",
    a: "Højst 3 måneders husleje i depositum og højst 3 måneders forudbetalt leje.",
  },
  {
    q: "Skal jeg betale skat af lejeindtægten?",
    a: "Ja, lejeindtægt er skattepligtig, men der er fradrag og bundfradrag afhængigt af, hvordan du udlejer. Se gennemgangen i guiden om skat på investeringsejendom.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Lejeberegner: beregn husleje ved udlejning",
      url: `${site.url}/beregn-husleje`,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: "da-DK",
      offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
      publisher: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: site.url },
        { "@type": "ListItem", position: 2, name: "Beregn husleje", item: `${site.url}/beregn-husleje` },
      ],
    },
  ],
};

export default function BeregnHuslejePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-700">Lejeberegner</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[48px]">
          Beregn husleje ved udlejning
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
          Huslejen for en udlejningsbolig afhænger af tre ting: hvor boligen ligger, hvor stor den er, og hvilke lejeregler der gælder for
          den. Skriv postnummer og areal, så får du et bud på markedslejen.
        </p>

        <div className="mt-8">
          <RentCalculator />
        </div>

        <section className="mt-14 space-y-4 text-[17px] leading-relaxed text-slate-700">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-slate-900">Sådan beregner du huslejen</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li><strong>Find lejen pr. m² i området.</strong> Se hvad tilsvarende boliger i samme postnummer udlejes for. Beregneren bruger NordInvests lejesatser for området.</li>
            <li><strong>Gang med boligens areal.</strong> 75 m² til 130 kr. pr. m² giver 9.750 kr. om måneden.</li>
            <li><strong>Tjek lejereglerne.</strong> Byggeåret og antallet af lejemål i ejendommen afgør, om du må tage markedsleje, eller om lejen skal fastsættes efter reglerne.</li>
            <li><strong>Afgør hvad lejen dækker.</strong> Varme, vand og el betales typisk a conto oven i lejen. Skriv det tydeligt i lejekontrakten.</li>
          </ol>

          <h2 className="pt-6 text-[26px] font-semibold tracking-[-0.02em] text-slate-900">Hvilke regler gælder for lejen?</h2>
          <p>
            Boliger i ejendomme taget i brug efter 31. december 1991 kan som hovedregel udlejes til fri leje. Udlejer du en enkelt ejerlejlighed
            eller et hus, må lejen som udgangspunkt ikke overstige det lejedes værdi, altså hvad tilsvarende boliger i området udlejes for. I
            ældre ejendomme i kommuner med huslejeregulering kan lejen være omkostningsbestemt og ligge et godt stykke under markedslejen.
          </p>
          <p>
            Er du i tvivl, så få lejefastsættelsen tjekket, før du køber. Lejen bærer hele afkastet, og for høj leje kan blive sat ned af
            huslejenævnet.
          </p>

          <h2 className="pt-6 text-[26px] font-semibold tracking-[-0.02em] text-slate-900">Kan udlejningen betale sig?</h2>
          <p>
            En leje på 9.800 kr. om måneden lyder godt, men det afgørende er, hvad der er tilbage efter lån, ejerudgift, vedligehold og
            tomgang. <Link href="/analyseren" className="font-medium text-blue-700 underline underline-offset-2">Analyseren</Link> regner
            det hele igennem for en konkret bolig, og <Link href="/deals" className="font-medium text-blue-700 underline underline-offset-2">Deal-motoren</Link> viser,
            hvilke boliger til salg der giver plus som udlejning. Skat af lejeindtægten er gennemgået i{" "}
            <Link href="/blog/ejendomsskat-investeringsejendom-2026" className="font-medium text-blue-700 underline underline-offset-2">guiden om skat på investeringsejendom</Link>.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">Ofte stillede spørgsmål</h2>
          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none text-[17px] font-semibold text-slate-900">{f.q}</summary>
                <p className="mt-2 text-[16px] leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
