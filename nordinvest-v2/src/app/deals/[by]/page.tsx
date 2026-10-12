import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DealMotorPanel } from "@/components/gate/DealMotorPanel";
import { CityDealsOptIn } from "@/components/deals/CityDealsOptIn";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import { dealCity } from "@/lib/deal-cities";
import { Assumptions, CityLinks, DealRanking, Faq, InvestmentRanking, MarketFigures, dealsJsonLd } from "@/components/deals/DealsSeo";

// Rendered per request; getDealSnapshot caches each kommune's market data for
// 6 hours. Unknown kommuner are a 404 (see dealCity below).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Worded the way people search: "investeringsejendomme <by>", "udlejningsejendom <by>".
const title = (c: { in: string }) => `Investeringsejendomme ${c.in}: de bedste til udlejning`;
const description = (c: { name: string; in: string }) =>
  `Investeringsejendomme, udlejningsboliger og erhvervsejendomme til salg ${c.in}, rangeret efter cashflow og afkast. Se hvilke der giver plus som udlejning. Opdateres hver 6. time.`;

export function generateMetadata({ params }: { params: { by: string } }): Metadata {
  const c = dealCity(params.by);
  if (!c) return {};
  const t = title(c);
  return {
    title: t,
    description: description(c),
    alternates: { canonical: `/deals/${c.slug}` },
    openGraph: {
      title: `${t} · NordInvest`,
      description: description(c),
      url: `/deals/${c.slug}`,
      type: "website",
      images: [{ url: "/deals/opengraph-image.jpg", width: 1200, height: 630, alt: "NordInvest Deal-motor: de bedste boliginvesteringer i Danmark, rangeret" }],
    },
  };
}

const krm2 = (n: number | null) => (n ? `${Math.round(n).toLocaleString("da-DK")} kr. pr. m²` : "ukendt");
const pct = (n: number | null) => (n != null ? `${n.toFixed(1).replace(".", ",")} %` : "ukendt");

export default async function CityDealsPage({ params }: { params: { by: string } }) {
  const c = dealCity(params.by);
  if (!c) notFound();
  const snap = await getDealSnapshot(c.slug, 8);
  const pctRaw = snap && snap.scanned ? Math.round((snap.positive / snap.scanned) * 100) : null;
  // 3 of 1.173 rounds to 0; "under 1" says what it is.
  const share = snap && pctRaw === 0 && snap.positive > 0 ? "under 1" : pctRaw;

  const faq = [
    {
      q: `Kan man få positivt cashflow på en udlejningsbolig ${c.in}?`,
      a: snap
        ? `Af de ${snap.scanned.toLocaleString("da-DK")} ejerlejligheder, villaer og rækkehuse til salg ${c.in}, som Deal-motoren har regnet på, giver ${snap.positive.toLocaleString("da-DK")} (${share} %) et positivt cashflow med 20 % udbetaling og 5 % rente. ${snap.positive === 0 ? "Med de nuværende priser skal man altså lægge en større udbetaling eller købe for værdistigningen." : "De står øverst i rangeringen på denne side."}`
        : `Det afhænger af prisen i forhold til lejen. Deal-motoren regner hver bolig til salg ${c.in} igennem med 20 % udbetaling og 5 % rente og viser, hvilke der giver plus.`,
    },
    {
      q: `Hvad koster en bolig pr. m² ${c.in}?`,
      a: snap
        ? `Medianprisen for helårsboliger til salg ${c.in} er ${krm2(snap.medianPricePerM2)}, og det mediane bruttoafkast er ${pct(snap.medianGrossYield)}. Tallene bygger på de boliger, der er til salg lige nu, ikke på solgte boliger.`
        : `Deal-motoren beregner medianprisen pr. m² ud fra de boliger, der er til salg ${c.in} lige nu.`,
    },
    {
      q: "Hvordan er lejen beregnet?",
      a: "Lejen er et estimat ud fra boligens areal og en lejesats pr. m² for området, justeret efter faktiske handler i regionen. Åbn en bolig i Analyseren for at rette lejen, udbetalingen eller renten og se tallene ændre sig.",
    },
  ];
  const jsonLd = dealsJsonLd({
    path: `/deals/${c.slug}`,
    name: title(c),
    description: description(c),
    snap,
    faq,
    crumbs: [
      { name: "Forside", path: "/" },
      { name: "Deal-motor", path: "/deals" },
      { name: c.name, path: `/deals/${c.slug}` },
    ],
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
          <nav aria-label="Brødkrummer" className="text-sm text-slate-500">
            <Link href="/deals" className="hover:text-slate-900 hover:underline">
              Deal-motor
            </Link>
            <span aria-hidden className="mx-2 text-slate-300">/</span>
            <span className="font-medium text-slate-700">{c.name}</span>
          </nav>
          <h1 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight [text-wrap:balance] sm:text-3xl md:text-4xl">
            Investeringsejendomme til salg {c.in}
          </h1>
          <p className="mt-2 text-[15px] font-medium text-slate-500">De bedste udlejningsboliger lige nu, regnet igennem af Deal-motoren</p>
          <p className="mt-3 max-w-2xl text-slate-600 sm:text-lg">
            {c.note}{" "}
            {snap
              ? `Deal-motoren har regnet på ${snap.scanned.toLocaleString("da-DK")} helårsboliger til salg ${c.in}; ${snap.positive.toLocaleString("da-DK")} af dem giver positivt cashflow.`
              : ""}
          </p>

          {snap && snap.top.length > 0 && (
            <>
              <div className="mt-6">
                <MarketFigures snap={snap} where={c.in} />
              </div>
              <h2 className="mt-10 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                Højest scorede boliger {c.in}
              </h2>
              <div className="mt-4">
                <DealRanking deals={snap.top} />
                <Assumptions updated={snap.updated} />
              </div>
              <CityDealsOptIn slug={c.slug} name={c.name} cityIn={c.in} />
              {snap.investments.length > 0 && (
                <>
                  <h2 className="mt-10 text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                    Erhvervsejendomme til salg {c.in}
                  </h2>
                  <div className="mt-4">
                    <InvestmentRanking deals={snap.investments} />
                  </div>
                </>
              )}
            </>
          )}

          <div className="mt-12">
            <DealMotorPanel where={c.in} />
          </div>
        </div>

        <section aria-labelledby="faq-h" className="border-t border-slate-200 bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <h2 id="faq-h" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                Investering {c.in}
              </h2>
              {c.guide && (
                <p className="mt-3 text-slate-600">
                  Læs også vores{" "}
                  <Link href={c.guide} className="font-medium text-blue-700 underline-offset-2 hover:underline">
                    guide til ejendomsinvestering {c.in}
                  </Link>
                  .
                </p>
              )}
              <p className="mt-3 text-slate-600">
                Sådan regner du selv en bolig igennem:{" "}
                <Link href="/analyse-af-ejendomsinvestering" className="font-medium text-blue-700 underline-offset-2 hover:underline">
                  analyse af ejendomsinvestering
                </Link>
                .
              </p>
            </div>
            <Faq items={faq} />
          </div>
        </section>

        <section aria-labelledby="more-h" className="border-t border-slate-200 px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 id="more-h" className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
              Bedste handler i andre byer
            </h2>
            <div className="mt-5">
              <CityLinks current={c.slug} />
            </div>
            <p className="mt-6 text-slate-600">
              <Link href="/deals" className="font-medium text-blue-700 underline-offset-2 hover:underline">
                Se hele Danmarks rangering i Deal-motoren
              </Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
