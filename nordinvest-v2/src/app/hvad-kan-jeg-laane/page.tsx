import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { LoanCalculator } from "@/components/buyer/LoanCalculator";
import { getMarketRates } from "@/lib/market-rates";
import { site } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: { absolute: "Hvad kan jeg låne til bolig? Beregner 2026 · NordInvest" },
  description:
    "Beregn hvor meget du kan låne til en bolig ud fra indkomst, opsparing og gæld. Se udbetaling, månedlig ydelse efter rentefradrag og hvor bidraget på realkreditlånet er billigst.",
  alternates: { canonical: "/hvad-kan-jeg-laane" },
};

const FAQ = [
  {
    q: "Hvor meget kan jeg låne til en bolig?",
    a: "Som tommelfingerregel vil bankerne ikke gerne have, at din samlede gæld overstiger fire gange husstandens indkomst før skat, og du skal selv betale mindst 5 % af prisen i udbetaling. Med en indkomst på 600.000 kr. og ingen anden gæld kan du typisk låne 2,4 mio. kr. og købe for omkring 2,5 mio. kr., hvis du har sparet 5 % og omkostningerne op.",
  },
  {
    q: "Hvor meget skal jeg have i udbetaling?",
    a: "Mindst 5 % af købsprisen. Dertil kommer tinglysning af skøde (1.850 kr. plus 0,6 % af prisen) og pantebrev (1.825 kr. plus 1,25 % af lånet) og en køberrådgiver. På en bolig til 3 mio. kr. er det samlet omkring 230.000 kr.",
  },
  {
    q: "Hvad er et rådighedsbeløb?",
    a: "Det, I har tilbage hver måned, når skat, boligudgifter, lån og faste udgifter er betalt. Bankerne kræver typisk mindst 6.000-9.000 kr. pr. voksen. Selv om gældsfaktoren er i orden, kan et lavt rådighedsbeløb betyde et mindre lån.",
  },
  {
    q: "Hvilket realkreditinstitut er billigst?",
    a: "Renten er den samme, fordi lånene finansieres med obligationer. Forskellen er bidraget. Efter prisbladene for 2026 er Totalkredit billigst for de fleste ejerboliger efter KundeKroner-rabatten, mens Jyske Realkredit og Nordea Kredit er dyrest på den del af lånet, der ligger over 40 % af boligens værdi.",
  },
];

export default async function HvadKanJegLaanePage() {
  const rates = await getMarketRates().catch(() => null);
  const rate = rates?.household.fixed ?? 4.5;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebApplication", name: "Hvad kan jeg låne til bolig?", url: `${site.url}/hvad-kan-jeg-laane`, applicationCategory: "FinanceApplication", operatingSystem: "Web", inLanguage: "da-DK", offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" }, publisher: { "@id": `${site.url}/#organization` } },
      { "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Forside", item: site.url }, { "@type": "ListItem", position: 2, name: "For boligkøbere", item: `${site.url}/boligkoeber` }, { "@type": "ListItem", position: 3, name: "Hvad kan jeg låne?", item: `${site.url}/hvad-kan-jeg-laane` }] },
    ],
  };
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-700">Låneberegner</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[48px]">Hvad kan jeg låne til en bolig?</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
          Skriv jeres indkomst, opsparing og anden gæld. Så ser I, hvad I typisk kan købe for, hvad det koster om måneden, og hvor bidraget på
          realkreditlånet er lavest. Renten er Nationalbankens tal for nye boliglån{rates ? ` (${rates.label})` : ""}.
        </p>
        <div className="mt-8"><LoanCalculator rate={rate} /></div>

        <section className="mt-14 space-y-4 text-[17px] leading-relaxed text-slate-700">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-slate-900">Sådan regner bankerne</h2>
          <p><strong>Gældsfaktoren</strong> er jeres samlede gæld divideret med husstandens indkomst før skat. Finanstilsynet har bedt bankerne være særligt forsigtige, når den kommer over 4, og især hvis I også låner mere end 60 % af boligens værdi med variabel rente eller afdragsfrihed.</p>
          <p><strong>Udbetalingen</strong> er mindst 5 %. Realkreditinstituttet låner op til 80 % af værdien, og banken låner resten med et boliglån, som er dyrere og kortere.</p>
          <p><strong>Rådighedsbeløbet</strong> er det, I har tilbage hver måned. Det er ofte det, der i praksis sætter grænsen for en barnefamilie.</p>
          <h2 className="pt-6 text-[26px] font-semibold tracking-[-0.02em] text-slate-900">Er boligen prisen værd?</h2>
          <p>
            Når I ved, hvad I kan låne, er næste spørgsmål, om boligen er pengene værd. På <Link href="/boligkoeber" className="font-medium text-blue-700 underline underline-offset-2">NordInvests boligkort</Link> er
            alle boliger til salg sammenlignet med lignende boliger i nærheden, så I kan se, om I betaler for meget, og hvad der bygges i området.
            Læs også <Link href="/saadan-byder-du-paa-en-bolig" className="font-medium text-blue-700 underline underline-offset-2">sådan byder du på en bolig</Link>.
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
