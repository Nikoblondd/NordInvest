import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DealFinder } from "@/components/deals/DealFinder";
import { Fold } from "@/components/ui/Fold";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import {
  Assumptions,
  CityLinks,
  DealRanking,
  Faq,
  HowItWorks,
  InvestmentRanking,
  MarketFigures,
  ScoreBands,
  dealsJsonLd,
} from "@/components/deals/DealsSeo";

// Rendered per request; the rankings themselves come from getDealSnapshot, which
// caches the market data for 6 hours. (A static build can't read the market
// table: its fetches are uncached by design.)
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TITLE = "Deal-motor: find de bedste investeringsboliger";
const DESCRIPTION =
  "Deal-motoren scanner hele det danske boligmarked og rangerer boliger og erhvervsejendomme efter cashflow, afkast og score. Se de bedste handler gratis, opdateret hver 6. time.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/deals" },
  openGraph: { title: `${TITLE} · NordInvest`, description: DESCRIPTION, url: "/deals", type: "website" },
};

export default async function DealsPage() {
  const snap = await getDealSnapshot(null, 10);
  const faq = [
    {
      q: "Hvad er NordInvests Deal-motor?",
      a: "Deal-motoren er et søgeværktøj, der gennemgår helårsboliger og erhvervsejendomme til salg i hele Danmark og regner hver enkelt igennem som investering. Den anslår markedslejen, trækker finansiering og driftsudgifter fra og giver hver bolig en score fra 0 til 100. Du kan filtrere på kommune, boligtype, pris og afkast og åbne en fuld analyse af enhver bolig med ét klik.",
    },
    {
      q: "Hvordan beregner Deal-motoren cashflow?",
      a: "Lejen anslås ud fra boligens areal og en lejesats pr. m² for området. Fra lejen trækkes ydelsen på et lån med 20 % udbetaling og 5 % rente samt ejerudgiften fra annoncen (eller 35 kr. pr. m² om måneden, hvis den mangler). Det, der er tilbage, er det månedlige cashflow før skat.",
    },
    {
      q: "Hvad betyder scoren?",
      a: "Scoren samler nettoafkast, kontantafkast, cashflow, gældsdækning (DSCR) og det forventede afkast over ejertiden i ét tal fra 0 til 100. 80 og derover er fremragende, 65 til 79 er solid, 45 til 64 er middel, og under 45 bærer tallene ikke handlen til den pris.",
    },
    {
      q: "Hvor kommer boligerne fra?",
      a: "Boliger kommer fra Boligsiden, der samler annoncer fra EDC, home, Nybolig, Danbolig og de fleste andre mæglere. Erhvervs- og investeringsejendomme kommer fra Ejendomstorvet, som oplyser et startafkast, så deres tal bygger på den faktiske leje i stedet for et estimat.",
    },
    {
      q: "Hvorfor er der så få ejerlejligheder med positivt cashflow?",
      a: snap
        ? `Kvadratmeterprisen på ejerlejligheder i de store byer er høj i forhold til lejen. Af de ${snap.scanned.toLocaleString("da-DK")} helårsboliger, Deal-motoren har regnet på, giver ${snap.positive.toLocaleString("da-DK")} et positivt cashflow med 20 % udbetaling og 5 % rente. Villaer og rækkehuse i provinsen står for de fleste af dem.`
        : "Kvadratmeterprisen på ejerlejligheder i de store byer er høj i forhold til lejen, så med 20 % udbetaling og 5 % rente er det oftest villaer og rækkehuse i provinsen, der giver positivt cashflow.",
    },
    {
      q: "Koster Deal-motoren noget?",
      a: "Du kan prøve den gratis: uden konto ser du de 3 bedste handler i hver søgning, og med en gratis konto de 10 bedste. Med Starter (fra 129 kr./md.) ser du alle handler og får kortet, de avancerede filtre og Deal-vagt, der mailer dig, når en ny handel dukker op.",
    },
  ];
  const jsonLd = dealsJsonLd({
    path: "/deals",
    name: "De bedste boliginvesteringer i Danmark lige nu",
    description: DESCRIPTION,
    snap,
    faq,
    crumbs: [
      { name: "Forside", path: "/" },
      { name: "Deal-motor", path: "/deals" },
    ],
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Deal-motor</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Find de bedste handler i hele Danmark.
            </h1>
            <p className="mt-2 text-sm text-slate-600 sm:mt-3 sm:text-base">
              Vi scanner hele markedet: boliger fra EDC, Home, Nybolig og Danbolig og
              investeringsejendomme fra Ejendomstorvet. Derefter rangerer vi dem efter, hvad de
              reelt kan som investering.
            </p>
          </div>

          <div className="mt-5 sm:mt-8">
            <DealFinder />
          </div>
        </div>

        {snap && snap.top.length > 0 && (
          <section aria-labelledby="top-h" className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto max-w-6xl">
              <h2 id="top-h" className="text-2xl font-semibold tracking-[-0.02em] [text-wrap:balance] sm:text-3xl">
                De bedste boliginvesteringer i Danmark lige nu
              </h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
                Deal-motoren har regnet på {snap.scanned.toLocaleString("da-DK")} ejerlejligheder, villaer og rækkehuse til
                salg. {snap.positive.toLocaleString("da-DK")} af dem giver et positivt cashflow. Her er de ti med den
                højeste score.
              </p>
              <div className="mt-6">
                <MarketFigures snap={snap} where="i Danmark" />
              </div>
              <div className="mt-6">
                <DealRanking deals={snap.top} />
                <Assumptions updated={snap.updated} />
              </div>

              {snap.investments.length > 0 && (
                <>
                  <h2 className="mt-14 text-2xl font-semibold tracking-[-0.02em] [text-wrap:balance] sm:text-3xl">
                    Erhvervsejendomme til salg: de bedste lige nu
                  </h2>
                  <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
                    Ud af {snap.investmentsScanned.toLocaleString("da-DK")} investerings- og erhvervsejendomme på
                    Ejendomstorvet har disse fem den højeste score. Tallene bygger på det oplyste startafkast.
                  </p>
                  <div className="mt-6">
                    <InvestmentRanking deals={snap.investments} />
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        <section aria-labelledby="how-h" className="border-t border-slate-200 px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 id="how-h" className="text-2xl font-semibold tracking-[-0.02em] [text-wrap:balance] sm:text-3xl">
              Sådan finder Deal-motoren gode investeringer
            </h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
              En boligannonce fortæller, hvad boligen koster. Deal-motoren regner ud, hvad den kan tjene. Hver bolig går
              gennem de samme fire trin, så handler i Esbjerg og på Østerbro kan sammenlignes på lige vilkår. Vil du forstå
              tallene bag, gennemgår vores guide til{" "}
              <Link href="/analyse-af-ejendomsinvestering" className="font-medium text-blue-700 underline-offset-2 hover:underline">
                analyse af ejendomsinvestering i Danmark
              </Link>{" "}
              hvert nøgletal med et regneeksempel.
            </p>
            <Fold label="Se de fire trin og scoren" labelOpen="Skjul">
            <div className="fold-body">
            <div className="mt-6">
              <HowItWorks />
            </div>

            <h2 className="mt-14 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Hvad betyder scoren?</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
              Scoren er den samme, som{" "}
              <Link href="/analyseren" className="font-medium text-blue-700 underline-offset-2 hover:underline">
                Analyseren
              </Link>{" "}
              giver, når du regner en enkelt bolig igennem. Læs mere om beregningerne under{" "}
              <Link href="/methodology" className="font-medium text-blue-700 underline-offset-2 hover:underline">
                metode og datakilder
              </Link>
              .
            </p>
            <div className="mt-6">
              <ScoreBands />
            </div>
            </div>
            </Fold>
          </div>
        </section>

        <section aria-labelledby="cities-h" className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 id="cities-h" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              De bedste handler i din by
            </h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
              Se Deal-motorens aktuelle rangering for de største udlejningsbyer, med kvadratmeterpriser og afkast for
              hver kommune.
            </p>
            <div className="mt-6">
              <CityLinks />
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-h" className="border-t border-slate-200 px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <h2 id="faq-h" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Spørgsmål om Deal-motoren
            </h2>
            <Faq items={faq} />
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
