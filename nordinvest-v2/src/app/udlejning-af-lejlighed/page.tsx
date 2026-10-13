import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Udlejning af lejlighed: regler og skat med eksempel (2026)" },
  description:
    "Regler for udlejning af lejlighed og skat af lejeindtægten: depositum, lejekontrakt, hvad du må tage i husleje, bundfradrag på 1⅓ % og et regneeksempel.",
  alternates: { canonical: "/udlejning-af-lejlighed" },
};

const FAQ = [
  {
    q: "Hvilke regler gælder for udlejning af en lejlighed?",
    a: "Lejeloven gælder: lejekontrakten skal være skriftlig, depositum og forudbetalt leje må højst være 3 måneders husleje hver, og lejen må som udgangspunkt ikke overstige det lejedes værdi. Ejerforeningens vedtægter kan desuden begrænse udlejning, fx korttidsudlejning.",
  },
  {
    q: "Hvordan bliver man beskattet af udlejning af en lejlighed?",
    a: "Det afhænger af, om du selv bor i boligen. Udlejer du værelser i din egen bolig eller din egen bolig en del af året, kan du bruge et bundfradrag på 1⅓ % af ejendomsværdien, mindst 24.000 kr. om året. Udlejer du en bolig, du ikke selv bor i, beskattes overskuddet efter fradrag for udgifterne.",
  },
  {
    q: "Kan jeg leje min ejerlejlighed ud?",
    a: "Ja, som hovedregel. Tjek ejerforeningens vedtægter og en eventuel bopælspligt i kommunen, og brug en skriftlig lejekontrakt.",
  },
  {
    q: "Må jeg fremleje min andelsbolig?",
    a: "Kun med bestyrelsens tilladelse og som regel i en begrænset periode. Reglerne står i foreningens vedtægter.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: "Udlejning af lejlighed: regler og skat med eksempel",
      inLanguage: "da-DK",
      datePublished: "2026-10-01",
      dateModified: "2026-10-01",
      author: { "@id": `${site.url}/#organization` },
      publisher: { "@id": `${site.url}/#organization` },
      mainEntityOfPage: `${site.url}/udlejning-af-lejlighed`,
    },
    { "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: site.url },
        { "@type": "ListItem", position: 2, name: "Udlejning af lejlighed", item: `${site.url}/udlejning-af-lejlighed` },
      ],
    },
  ],
};

const h2 = "pt-6 text-[26px] font-semibold tracking-[-0.02em] text-slate-900";
const a = "font-medium text-blue-700 underline underline-offset-2";

export default function UdlejningPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <article className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-700">Guide · opdateret 1. oktober 2026</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[48px]">
          Udlejning af lejlighed: regler og skat
        </h1>
        <p className="mt-5 text-[19px] leading-relaxed text-slate-800">
          Når du lejer en lejlighed ud, gælder lejeloven for kontrakten og huslejen, og lejeindtægten er skattepligtig. Hvordan den beskattes,
          afhænger af ét spørgsmål: bor du selv i boligen, eller er det en investeringsbolig?
        </p>

        <div className="mt-10 space-y-4 text-[17px] leading-relaxed text-slate-700">
          <h2 className={h2}>Reglerne for udlejning</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Skriftlig lejekontrakt.</strong> Brug den gældende typeformular til boliglejekontrakter, og skriv alle særlige vilkår ind.</li>
            <li><strong>Depositum og forudbetalt leje</strong> må hver højst være 3 måneders husleje.</li>
            <li><strong>Huslejen</strong> må som udgangspunkt ikke være højere end det lejedes værdi: det, tilsvarende boliger i området udlejes for. Boliger i ejendomme taget i brug efter 31. december 1991 kan som hovedregel udlejes til fri leje. <Link href="/beregn-husleje" className={a}>Beregn huslejen her</Link>.</li>
            <li><strong>Ejerforeningen</strong> kan have regler om udlejning, fx forbud mod korttidsudlejning. Læs vedtægterne, før du køber.</li>
            <li><strong>Bopælspligt.</strong> I kommuner med bopælspligt skal en helårsbolig bebos. Udlejning til en lejer opfylder som regel pligten.</li>
            <li><strong>Andelsbolig.</strong> Fremleje kræver bestyrelsens tilladelse og er som regel tidsbegrænset.</li>
          </ul>

          <h2 className={h2}>Skat af lejeindtægten</h2>
          <p>
            <strong>Udlejer du værelser i din egen bolig, eller hele din egen bolig en del af året,</strong> kan du bruge et bundfradrag. For en
            ejerbolig er det 1⅓ % af den ejendomsværdi, der bruges til ejendomsværdiskatten, dog mindst 24.000 kr. om året. Lejer du selv
            boligen og fremlejer, er bundfradraget 2/3 af den årlige husleje. Du beskattes kun af det, der ligger over bundfradraget. I stedet
            for bundfradraget kan du vælge en regnskabsmæssig opgørelse med fradrag for de faktiske udgifter. (Kilde:{" "}
            <a href="https://info.skat.dk/data.aspx?oid=2285015" className={a} rel="noopener">Skattestyrelsens juridiske vejledning, LL § 15 P</a>.)
          </p>
          <p>
            <strong>Udlejer du en bolig, du ikke selv bor i,</strong> gælder bundfradraget ikke. Så beskattes overskuddet: lejeindtægten minus
            udgifterne til ejerudgift, grundskyld, forsikring, vedligehold og administration. Renteudgifter fradrages i kapitalindkomsten. Mange
            investorer bruger virksomhedsordningen eller kapitalafkastordningen; tal med en revisor om, hvad der passer til dig.
          </p>

          <h2 className={h2}>Eksempel: skat ved udlejning af egen lejlighed</h2>
          <p>
            Du lejer din ejerlejlighed ud i 6 måneder, mens du arbejder i udlandet. Ejendomsværdien er 2.400.000 kr., og lejen er 10.000 kr.
            om måneden.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-[15px] tabular-nums">
              <tbody className="divide-y divide-slate-100">
                <tr><td className="px-4 py-2.5">Lejeindtægt, 6 × 10.000 kr.</td><td className="px-4 py-2.5 text-right">60.000 kr.</td></tr>
                <tr><td className="px-4 py-2.5">Bundfradrag, 1⅓ % af 2.400.000 kr.</td><td className="px-4 py-2.5 text-right">− 32.000 kr.</td></tr>
                <tr className="font-semibold"><td className="px-4 py-2.5">Skattepligtig lejeindtægt</td><td className="px-4 py-2.5 text-right">28.000 kr.</td></tr>
              </tbody>
            </table>
          </div>
          <p>De 28.000 kr. beskattes som personlig indkomst. Med en regnskabsmæssig opgørelse kunne du i stedet trække de faktiske udgifter fra; det kan betale sig, hvis udgifterne er høje.</p>

          <h2 className={h2}>Kan udlejningen betale sig?</h2>
          <p>
            Skatten er kun én del af regnestykket. <Link href="/analyseren" className={a}>Analyseren</Link> regner lån, udgifter, tomgang og
            cash flow igennem for en konkret bolig, og <Link href="/deals" className={a}>Deal-motoren</Link> viser, hvilke boliger til salg
            der giver plus som udlejning. Læs også om <Link href="/blog/ejendomsskat-investeringsejendom-2026" className={a}>skat på investeringsejendom</Link>,{" "}
            <Link href="/blog/airbnb-regler-2026" className={a}>Airbnb-reglerne</Link> og <Link href="/ordbog/det-lejedes-vaerdi" className={a}>det lejedes værdi</Link>.
          </p>
          <p className="text-[14px] text-slate-500">Siden er generel information, ikke skatte- eller juridisk rådgivning. Reglerne afhænger af din situation.</p>
        </div>

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
      </article>
      <Footer />
    </main>
  );
}
