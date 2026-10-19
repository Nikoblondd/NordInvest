import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HeroInput } from "@/components/home/HeroInput";
import { geist, serif } from "@/components/home/fonts";
import { site } from "@/lib/site";

/*
 * Pillar page for "ejendomsinvestering analyse Danmark": a complete, honest
 * guide to analysing a Danish investment property, with the tool one click
 * away. Hub for the analysis cluster (blog guides, city pages, glossary).
 */

const PATH = "/analyse-af-ejendomsinvestering";
const TITLE = "Analyse af ejendomsinvestering i Danmark: sådan regner du en bolig igennem";
const DESCRIPTION =
  "Guide til analyse af ejendomsinvestering i Danmark: cashflow, afkast, lån, drift, rentestress og lokalplaner. Med regneeksempel og analyseværktøj.";

export const metadata: Metadata = {
  title: { absolute: "Analyse af ejendomsinvestering i Danmark: guide · NordInvest" },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "article", url: PATH, images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "NordInvest: se hvad huset tjener, før du byder" }] },
};

const QUESTIONS: { q: string; body: string; metric: string }[] = [
  {
    q: "Tjener boligen penge hver måned?",
    body: "Træk lån, grundskyld, forsikring, vedligehold og tomgang fra huslejen. Det, der er tilbage, er dit cashflow. Se også, hvor meget lejen kan falde, før du går i minus. Den buffer kalder vi lejereserven.",
    metric: "Cashflow og lejereserve",
  },
  {
    q: "Er prisen fair?",
    body: "Sammenlign prisen pr. m² med boliger til salg af samme type og størrelse i samme postnummer. En pris over niveauet skal kunne forklares af stand, beliggenhed eller udlejningspotentiale.",
    metric: "Pris pr. m² mod området",
  },
  {
    q: "Holder budgettet for udgifterne?",
    body: "Salgsopstillingens faste udgifter er ofte sat lavt. Regn selv med vedligehold, forsikring og tomgang, og sammenlign med lignende boliger.",
    metric: "Faste udgifter mod lignende boliger",
  },
  {
    q: "Hvad sker der, hvis renten stiger?",
    body: "Regn handlen igennem ved flere renter. Den rente, hvor cashflowet rammer nul, er din break-even-rente. Jo længere den ligger fra dagens rente, jo mere robust er handlen.",
    metric: "Break-even-rente",
  },
  {
    q: "Ligger der udgifter i planerne?",
    body: "Slå adressen op i Plandata og kommunens spildevandsplan. Kloakseparering, nye lokalplaner og vejprojekter kan koste penge, som sjældent står i salgsopstillingen.",
    metric: "Lokalplaner og kloakopland",
  },
];

const METRICS: { name: string; how: string; use: string }[] = [
  { name: "Bruttoafkast", how: "Årlig leje ÷ købspris", use: "Hurtig sammenligning af boliger. Siger intet om lån og drift." },
  { name: "Nettoafkast", how: "(Årlig leje − driftsudgifter) ÷ købspris", use: "Afkastet før finansiering. Godt til at sammenligne på tværs af områder." },
  { name: "Cashflow", how: "Leje − lån − drift − tomgang pr. måned", use: "Det, der faktisk lander på kontoen. Det vigtigste tal for de fleste private investorer." },
  { name: "Kontantafkast", how: "Årligt cashflow ÷ din udbetaling", use: "Hvad dine egne penge giver i afkast. Stiger med mere lån, men det gør risikoen også." },
  { name: "DSCR", how: "Leje efter drift ÷ ydelse på lån", use: "Hvor godt lejen dækker lånet. Under 1 betyder, at du selv skal betale til." },
  { name: "Break-even-rente", how: "Renten, hvor cashflow = 0", use: "Din margin, hvis renten stiger." },
];

const EXAMPLE: { label: string; value: number }[] = [
  { label: "Husleje", value: 13_000 },
  { label: "Realkreditlån (80 %, 4 % fast, inkl. bidrag)", value: -8_650 },
  { label: "Grundskyld", value: -900 },
  { label: "Vedligehold", value: -1_300 },
  { label: "Forsikring", value: -400 },
  { label: "Tomgang (5 % af lejen)", value: -650 },
];

const STEPS: { title: string; body: string }[] = [
  { title: "Find markedslejen", body: "Brug lignende udlejningsboliger i området, ikke mæglerens bedste bud. Regn med en realistisk leje, ikke den højeste." },
  { title: "Læg finansieringen", body: "For en udlejningsbolig ligger realkredit typisk på op til 80 % af værdien. Resten er udbetaling og eventuelt banklån. Husk bidragssatsen." },
  { title: "Budgetter driften", body: "Grundskyld, forsikring, vedligehold og tomgang. Som udlejer betaler du ikke ejendomsværdiskat af boligen, men du betaler grundskyld." },
  { title: "Regn cashflow og afkast", body: "Træk alt fra lejen, og regn brutto-, netto- og kontantafkast. Se på cashflow først." },
  { title: "Stresstest", body: "Hæv renten, sænk lejen, og læg en måned uden lejer ind. Hold handlen, hvis den stadig går rundt?" },
  { title: "Tjek jura og planer", body: "Hvilke lejeregler gælder for boligen? Er der kloakprojekter eller en ny lokalplan på vej? Spørg en advokat før du skriver under." },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Hvad er en analyse af en ejendomsinvestering?",
    a: "Det er en gennemregning af, om en bolig kan betale sig som investering: lejeindtægt minus lån og drift, afkast, risiko ved stigende rente og forhold som pris pr. m², lokalplaner og lejeregler.",
  },
  {
    q: "Hvilket afkast er godt for en udlejningsbolig i Danmark?",
    a: "Det afhænger af område, boligtype og rente. Se først på cashflow og break-even-rente: en bolig med positivt cashflow og god afstand til break-even-renten er mere robust end en med højt bruttoafkast, men stramt budget.",
  },
  {
    q: "Betaler man ejendomsværdiskat af en udlejningsbolig?",
    a: "Nej, ejendomsværdiskat betales af boliger, du selv bor i. Som udlejer betaler du grundskyld til kommunen, og lejeindtægten beskattes som indkomst.",
  },
  {
    q: "Kan jeg analysere en bolig gratis?",
    a: "Du kan prøve en hurtig beregning gratis på forsiden af NordInvest. Den fulde analyse med cashflow, afkast, rentestress, markedsdata, bankrapport og pipeline er en del af NordInvest, hvor adgangen gives efter en kort samtale.",
  },
  {
    q: "Er en analyse det samme som rådgivning?",
    a: "Nej. En analyse er et regnestykke og et beslutningsgrundlag. Tal med din bank, en advokat og eventuelt en revisor, før du køber.",
  },
];

const LINKS: { href: string; label: string }[] = [
  { href: "/blog/ejendomsinvestering", label: "Ejendomsinvestering: den komplette guide" },
  { href: "/blog/sadan-beregner-du-lejeafkast", label: "Sådan beregner du lejeafkast" },
  { href: "/blog/cash-flow-ejendom-danmark-2026", label: "Cash flow på en ejendom i Danmark" },
  { href: "/blog/beregn-afkast-paa-udlejningsejendom", label: "Beregn afkast på en udlejningsejendom" },
  { href: "/blog/analysevaerktoej-til-ejendomsinvestering", label: "Analyseværktøj til ejendomsinvestering" },
  { href: "/blog/ejendomsinvestering-for-begyndere-2026", label: "Ejendomsinvestering for begyndere" },
  { href: "/blog/foraeldrekoeb-2026", label: "Forældrekøb 2026: regler og skat" },
  { href: "/blog/airbnb-regler-2026", label: "Airbnb-regler 2026: 70 dage og bundfradrag" },
  { href: "/blog/sommerhus-som-investering-2026", label: "Sommerhus som investering 2026" },
  { href: "/investering-i-ejendom-koebenhavn", label: "Investering i ejendom i København" },
  { href: "/investering-i-ejendom-aarhus", label: "Investering i ejendom i Aarhus" },
  { href: "/glossary", label: "Ordbog: nøgletal og begreber" },
];

const kr = (n: number) => n.toLocaleString("da-DK");

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-thesis text-[2rem] font-normal leading-[1.05] tracking-[-0.01em] text-[#17213a] [text-wrap:balance] sm:text-[2.6rem]">
      {children}
    </h2>
  );
}

export default function AnalyseGuidePage() {
  const total = EXAMPLE.reduce((s, r) => s + r.value, 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: TITLE,
        description: DESCRIPTION,
        inLanguage: "da-DK",
        mainEntityOfPage: `${site.url}${PATH}`,
        datePublished: "2026-09-25",
        dateModified: "2026-09-25",
        author: { "@id": `${site.url}/#organization` },
        publisher: { "@id": `${site.url}/#organization` },
        about: ["Ejendomsinvestering", "Investeringsanalyse", "Udlejningsbolig", "Danmark"],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Forside", item: site.url },
          { "@type": "ListItem", position: 2, name: "Analyse af ejendomsinvestering", item: `${site.url}${PATH}` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <div className={`${serif.variable} ${geist.variable} min-h-screen overflow-x-clip bg-[#f6f4ef] font-geist text-slate-900`}>
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="drafting-paper px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Brødkrumme" className="mb-6 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-800">
              Forside
            </Link>{" "}
            / <span className="text-slate-700">Analyse af ejendomsinvestering</span>
          </nav>
          <h1 className="font-thesis text-[2.8rem] font-normal leading-[0.98] tracking-[-0.015em] text-[#17213a] [text-wrap:balance] sm:text-[4.2rem]">
            Analyse af ejendomsinvestering i Danmark
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            En bolig er en god investering, hvis lejen betaler lånet, driften og en buffer, og handlen stadig holder,
            når renten stiger. Her er, hvordan du regner det igennem, trin for trin, med de danske regler og tal, der
            betyder noget.
          </p>
          <div className="mt-8 max-w-xl">
            <HeroInput />
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Har du en bolig i tankerne? Prøv en gratis beregning, eller anmod om adgang til hele analysen.
          </p>
        </div>
      </header>

      <main className="px-4 sm:px-6">
        <article className="mx-auto max-w-3xl space-y-16 py-14 sm:space-y-20 sm:py-20">
          <section>
            <H2>
              Fem spørgsmål, <span className="text-slate-400">som analysen skal besvare</span>
            </H2>
            <p className="mt-4 leading-relaxed text-slate-600">
              En god analyse starter ikke med et regneark, men med de spørgsmål, en erfaren investor stiller, før hun byder.
            </p>
            <ol className="mt-8 space-y-4">
              {QUESTIONS.map((x, i) => (
                <li key={x.q} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200 sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">{i + 1}</span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{x.q}</h3>
                      <p className="mt-1.5 leading-relaxed text-slate-600">{x.body}</p>
                      <p className="mt-2 text-sm font-medium text-blue-700">Nøgletal: {x.metric}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <H2>
              Nøgletallene <span className="text-slate-400">og hvad de bruges til</span>
            </H2>
            <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-slate-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Nøgletal</th>
                    <th scope="col" className="px-4 py-3 font-medium">Sådan regnes det</th>
                    <th scope="col" className="px-4 py-3 font-medium">Brug det til</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {METRICS.map((m) => (
                    <tr key={m.name}>
                      <th scope="row" className="px-4 py-3 font-semibold text-slate-900">{m.name}</th>
                      <td className="px-4 py-3 text-slate-700">{m.how}</td>
                      <td className="px-4 py-3 text-slate-600">{m.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Flere begreber finder du i <Link href="/glossary" className="text-blue-700 hover:underline">ordbogen</Link> og i vores{" "}
              <Link href="/methodology" className="text-blue-700 hover:underline">metode</Link>.
            </p>
          </section>

          <section>
            <H2>
              Et regneeksempel <span className="text-slate-400">på en villa til udlejning</span>
            </H2>
            <p className="mt-4 leading-relaxed text-slate-600">
              En villa på 132 m² til 1.995.000 kr. med 20 % i udbetaling. Tallene er et opdigtet, afrundet eksempel.
            </p>
            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200">
              <ul className="divide-y divide-slate-100">
                {EXAMPLE.map((r) => (
                  <li key={r.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm sm:px-5">
                    <span className="text-slate-700">{r.label}</span>
                    <span className={`font-semibold tabular-nums ${r.value > 0 ? "text-slate-900" : "text-slate-600"}`}>
                      {r.value > 0 ? "+" : "−"}
                      {kr(Math.abs(r.value))} kr.
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-4 bg-emerald-50 px-4 py-3.5 sm:px-5">
                <span className="font-semibold text-slate-900">Cashflow pr. måned</span>
                <span className="text-xl font-bold tabular-nums text-emerald-700">+{kr(total)} kr.</span>
              </div>
            </div>
            <p className="mt-4 leading-relaxed text-slate-600">
              Det giver et bruttoafkast på 7,8 % og et kontantafkast på 3,3 % af udbetalingen. Cashflowet er positivt, indtil
              renten når omkring 5,2 %. Lejen kan falde 1.100 kr. om måneden, før handlen giver underskud.
            </p>
          </section>

          <section>
            <H2>
              Sådan analyserer du <span className="text-slate-400">trin for trin</span>
            </H2>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-blue-700">Trin {i + 1}</div>
                  <h3 className="mt-1 text-base font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <H2>
              Særligt for Danmark
            </H2>
            <div className="mt-6 space-y-4 leading-relaxed text-slate-600">
              <p>
                <strong className="text-slate-900">Lejeregler.</strong> Hvor meget du må tage i leje, afhænger af boligen. For
                ældre udlejningsboliger kan lejen være reguleret af lejeloven, mens nyere byggeri ofte kan udlejes til
                markedsleje. Undersøg reglerne for den konkrete bolig, før du regner med en leje.
              </p>
              <p>
                <strong className="text-slate-900">Andelsboliger</strong> kan normalt ikke købes for at blive udlejet. Til
                udlejning ser de fleste private investorer på ejerlejligheder, rækkehuse og villaer.
              </p>
              <p>
                <strong className="text-slate-900">Skat.</strong> Lejeindtægten beskattes, og du betaler grundskyld. Om det
                bedst kan betale sig at eje boligen privat eller i selskab, er et spørgsmål til en revisor.
              </p>
              <p>
                <strong className="text-slate-900">Data.</strong> Danske boliger kan slås op i BBR (areal, byggeår, anvendelse),
                og Danmarks Statistik offentliggør prisudviklingen. Plandata viser lokalplaner. Det er de kilder, en analyse
                bør bygge på.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl bg-[#17213a] p-6 text-white shadow-card-lift sm:p-8">
            <h2 className="font-thesis text-[2rem] font-normal leading-[1.05] sm:text-[2.4rem]">Lad NordInvest regne den igennem</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-blue-100">
              Cashflow, afkast, rentestress, pris mod området og planer for adressen på under et minut. Analysen er en
              del af NordInvest, som du får adgang til efter en kort samtale.
            </p>
            <div className="mt-6 max-w-xl">
              <HeroInput />
            </div>
            <p className="mt-4 text-sm text-blue-200">
              Eller se <Link href="/deals" className="font-semibold text-white underline-offset-2 hover:underline">månedens bedste handler</Link> i Deal-motoren.
            </p>
          </section>

          <section>
            <H2>Spørgsmål og svar</H2>
            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {FAQ.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="text-xl text-slate-400 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-5 pr-8 leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900">Læs videre</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-card ring-1 ring-slate-200 hover:text-blue-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-slate-500">
              Indholdet er generel information og ikke personlig finansiel rådgivning.
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
