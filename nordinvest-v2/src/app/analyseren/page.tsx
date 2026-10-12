import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AnalyzerApp } from "@/components/analyzer/AnalyzerApp";
import { HeroInput } from "@/components/home/HeroInput";
import Link from "next/link";
import { geist } from "@/components/home/fonts";
import { toolUser } from "@/lib/gate";
import { LockedTool } from "@/components/gate/LockedTool";

const baseMeta: Metadata = {
  title: "Analysér en ejendomsinvestering: overskud, afkast og renterisiko",
  description:
    "Analyse af ejendomsinvestering i Danmark: bruttoafkast, cash flow, rentestress-test og 10 år frem, med data fra BBR og Danmarks Statistik. En del af NordInvest, med adgang efter en kort samtale.",
  alternates: { canonical: "/analyseren" },
};

// A shared analysis link gets its own preview: the address and what the
// property gives each month, drawn by /api/og/analyse from the link's numbers.
export function generateMetadata({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Metadata {
  const one = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : "");
  if (!one("price")) return baseMeta;
  const q = new URLSearchParams();
  for (const k of ["addr", "price", "rent", "opex", "downPaymentPct", "interestRate"]) if (one(k)) q.set(k, one(k));
  const where = one("addr").split(",")[0];
  const title = where ? `Analyse af ${where}` : "Analyse af en bolig";
  return {
    ...baseMeta,
    openGraph: {
      title: `${title} · NordInvest`,
      description: "Cash flow, afkast, rentestress og 10-års fremskrivning, regnet igennem på NordInvest.",
      images: [{ url: `/api/og/analyse?${q.toString()}`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image" },
  };
}

// The analyser speaks in one typeface: Geist, for headlines and numbers alike.
// Components that ask for `font-display`/`font-sans` resolve to it inside here,
// while the site header and footer keep the global type.
const geistScope = {
  "--font-display": "var(--font-geist)",
  "--font-inter": "var(--font-geist)",
} as CSSProperties;

export const dynamic = "force-dynamic";

export default async function AnalyserenPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // Closed platform: the analyser itself is only rendered for accounts with tool access.
  if (!(await toolUser())) {
    return (
      <div className="min-h-[100dvh] overflow-x-clip bg-white text-slate-900">
        <Nav />
        <main className={`${geist.variable} font-geist antialiased`} style={geistScope}>
          <LockedTool title="Analysér enhver dansk bolig." lead="Analyseren regner en bolig igennem på et minut: overskud, afkast, renterisiko og 10 år frem, med data fra BBR og Danmarks Statistik. Den er en del af NordInvest, som du får adgang til efter en kort samtale." />
          <WhatYouGet />
        </main>
        <Footer />
      </div>
    );
  }
  // With a property loaded, the verdict is the first thing under the header.
  const analyzing = !!(searchParams.url || searchParams.price || searchParams.saved);

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-white text-slate-900">
      <a
        href="#analyse"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Gå til analysen
      </a>
      <Nav />
      <main id="analyse" className={`${geist.variable} font-geist antialiased`} style={geistScope}>
        {analyzing ? (
          <h1 className="sr-only">Din analyse af boligen</h1>
        ) : (
          <section className="px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
            <div className="mx-auto max-w-[1080px]">
              <h1 className="max-w-3xl text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] [text-wrap:balance] sm:text-[64px]">
                Analysér enhver dansk bolig.
              </h1>
              <p className="mt-5 max-w-xl text-[19px] leading-relaxed text-slate-600">
                Indsæt et link fra Boligsiden, EDC eller en anden boligside. Vi henter tallene, og du får dommen på sekunder.
              </p>
              <div className="mt-8 max-w-2xl">
                <HeroInput />
              </div>
            </div>
          </section>
        )}

        <Suspense fallback={null}>
          <AnalyzerApp />
        </Suspense>

        {!analyzing && <WhatYouGet />}

        {analyzing && (
          <section aria-labelledby="next-property" className="bg-[#f4f6f9] px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-[1080px]">
              <h2 id="next-property" className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">
                Analysér en anden ejendom.
              </h2>
              <p className="mt-2 text-[17px] text-slate-600">Indsæt et nyt link, så er dommen klar på et øjeblik.</p>
              <div className="mt-6 max-w-2xl">
                <HeroInput />
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

// What an analysis contains, in the HTML itself: the empty analyser is only a
// form, so this is what search engines and AI assistants read about it.
const FIGURES = [
  { t: "Cashflow pr. måned", d: "Leje minus ydelse, fællesudgifter, vedligehold og tomgang. Det, der er tilbage til dig hver måned." },
  { t: "Nettoafkast og bruttoafkast", d: "Årlig leje i forhold til prisen, før og efter driftsudgifter." },
  { t: "Kontantafkast", d: "Hvad din egen udbetaling forrenter sig med, efter at ydelsen på lånet er betalt." },
  { t: "Gældsdækning (DSCR)", d: "Hvor mange gange lejen dækker ydelsen på lånet. Under 1 betyder, at du selv må lægge til." },
  { t: "Rentestress og break-even-rente", d: "Hvad der sker med cashflowet, hvis renten stiger, og ved hvilken rente handlen går i nul." },
  { t: "Lejereserve", d: "Hvor meget lejen kan falde, før boligen ikke længere betaler sig selv." },
  { t: "Friværdi over 10 år", d: "Hvordan afdrag og værdistigning bygger formue op år for år." },
  { t: "Pris mod området", d: "Kvadratmeterprisen sammenlignet med lignende boliger til salg i samme postnummer." },
  { t: "Lokalplaner og kloakprojekter", d: "Kommende byrder fra Plandata, der kan koste dig penge efter købet." },
];

function WhatYouGet() {
  return (
    <section aria-labelledby="what-h" className="bg-[#f4f6f9] px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-[1080px]">
        <h2 id="what-h" className="max-w-2xl text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance] sm:text-[40px]">
          Det får du i analysen.
        </h2>
        <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate-600">
          NordInvest regner boligen igennem, som en erfaren investor ville gøre det, og giver en samlet score fra 0 til 100.
          Du kan rette alle tal bagefter og se resultatet ændre sig med det samme.
        </p>
        <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {FIGURES.map((f) => (
            <div key={f.t} className="bg-white p-5 sm:p-6">
              <dt className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{f.t}</dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{f.d}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-12 grid gap-8 border-t border-slate-200 pt-10 sm:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.01em]">Hvor tallene kommer fra</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              Pris, areal og ejerudgift fra boligannoncen. Bygningsdata fra BBR. Lejeniveau og prisudvikling fra Danmarks
              Statistik og vores egen markedsindsamling. Lokalplaner fra Plandata.dk.{" "}
              <Link href="/methodology" className="font-medium text-blue-700 underline-offset-2 hover:underline">
                Læs om metoden
              </Link>
              .
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-[-0.01em]">Ny i ejendomsinvestering?</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              Guiden{" "}
              <Link href="/analyse-af-ejendomsinvestering" className="font-medium text-blue-700 underline-offset-2 hover:underline">
                analyse af ejendomsinvestering
              </Link>{" "}
              gennemgår hvert nøgletal med et regneeksempel. Leder du efter en bolig at regne på, så se{" "}
              <Link href="/deals" className="font-medium text-blue-700 underline-offset-2 hover:underline">
                de bedste boliger lige nu
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
