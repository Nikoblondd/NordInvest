import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { YieldCalculator } from "@/components/calculators/YieldCalculator";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import { site } from "@/lib/site";

// The "what is a normal yield right now" line uses the live Deal-motor median.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: { absolute: "Beregn afkast på ejendom: afkastberegner med formler · NordInvest" },
  description:
    "Beregn bruttoafkast, nettoafkast (afkastningsgrad), kontantafkast og cash flow på en udlejningsbolig. Med formlerne, så du også kan regne det i Excel.",
  alternates: { canonical: "/beregn-afkast" },
};

const FAQ = [
  {
    q: "Hvordan beregner man afkastningsgrad?",
    a: "Afkastningsgraden er det årlige driftsresultat divideret med købsprisen. Driftsresultatet er lejen for et år minus de faste udgifter, men før renter og afdrag. Lejer du ud for 120.000 kr. om året med 30.000 kr. i udgifter, og koster ejendommen 2 mio. kr., er afkastningsgraden 90.000 / 2.000.000 = 4,5 %.",
  },
  {
    q: "Hvad er forskellen på bruttoafkast og nettoafkast?",
    a: "Bruttoafkastet er lejen for et år divideret med købsprisen. Nettoafkastet trækker først de faste udgifter fra lejen. Nettoafkastet er altid lavere og siger mere om, hvad du faktisk tjener.",
  },
  {
    q: "Hvad er kontantafkast?",
    a: "Kontantafkastet er det, der er tilbage efter alle udgifter og ydelsen på lånet, divideret med din egen udbetaling. Det viser, hvad dine egne penge giver, når lånet er med i regnestykket.",
  },
  {
    q: "Hvordan beregner jeg afkast i Excel?",
    a: "Med købsprisen i B1, månedslejen i B2 og de faste udgifter pr. måned i B3: bruttoafkast =B2*12/B1, nettoafkast =(B2-B3)*12/B1. Ydelsen på lånet finder du med =YDELSE(rente/12;360;-lån) i dansk Excel.",
  },
];

export default async function BeregnAfkastPage() {
  const snap = await getDealSnapshot(null, 1).catch(() => null);
  const median = snap?.medianGrossYield != null ? `${snap.medianGrossYield.toFixed(1).replace(".", ",")} %` : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Afkastberegner til udlejningsejendom",
        url: `${site.url}/beregn-afkast`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "da-DK",
        offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
        publisher: { "@id": `${site.url}/#organization` },
      },
      { "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Forside", item: site.url },
          { "@type": "ListItem", position: 2, name: "Beregn afkast", item: `${site.url}/beregn-afkast` },
        ],
      },
    ],
  };

  const formula = "rounded-xl bg-slate-900 px-4 py-3 font-mono text-[14px] text-slate-100";
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-700">Afkastberegner</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[48px]">
          Beregn afkast på en udlejningsbolig
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
          Afkastet viser, hvor meget en bolig tjener i forhold til, hvad den koster. Skriv pris, leje og udgifter, så får du bruttoafkast,
          nettoafkast, kontantafkast og cash flow med det samme.
        </p>

        <div className="mt-8">
          <YieldCalculator />
        </div>

        <section className="mt-14 space-y-4 text-[17px] leading-relaxed text-slate-700">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-slate-900">Formlerne</h2>
          <p><strong>Bruttoafkast</strong> er lejen for et år divideret med købsprisen.</p>
          <p className={formula}>Bruttoafkast = årlig leje / købspris × 100</p>
          <p><strong>Nettoafkast</strong>, også kaldet afkastningsgrad, trækker de faste udgifter fra først.</p>
          <p className={formula}>Nettoafkast = (årlig leje − faste udgifter) / købspris × 100</p>
          <p><strong>Kontantafkast</strong> tager lånet med og måler afkastet på din egen udbetaling.</p>
          <p className={formula}>Kontantafkast = (årlig leje − udgifter − ydelse) / udbetaling × 100</p>

          <h2 className="pt-6 text-[26px] font-semibold tracking-[-0.02em] text-slate-900">Hvad er et godt afkast?</h2>
          <p>
            {median
              ? `Det mediane bruttoafkast for helårsboliger til salg i Danmark er ${median} lige nu, ifølge Deal-motorens gennemgang af ${snap!.scanned.toLocaleString("da-DK")} boliger. `
              : ""}
            Afkastet er højere i provinsen end i de store byer, fordi prisen pr. m² falder hurtigere end lejen. Et højt bruttoafkast er ikke
            nok i sig selv: med 20 % udbetaling og 5 % rente skal nettoafkastet typisk ligge over renten, før boligen giver positivt cash flow.
            Se afkastet for din by i <Link href="/deals" className="font-medium text-blue-700 underline underline-offset-2">Deal-motoren</Link>,
            og regn lejen ud med <Link href="/beregn-husleje" className="font-medium text-blue-700 underline underline-offset-2">lejeberegneren</Link>.
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
