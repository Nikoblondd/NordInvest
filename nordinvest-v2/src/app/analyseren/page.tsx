import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AnalyzerApp } from "@/components/analyzer/AnalyzerApp";
import { HeroInput } from "@/components/home/HeroInput";
import { geist } from "@/components/home/fonts";

export const metadata: Metadata = {
  title: "Analysér din ejendomsinvestering – enhver dansk bolig",
  description:
    "Gratis analyse af ejendomsinvestering i Danmark: indsæt et boliglink og få bruttoafkast, cash flow, rentestress-test og 5-årig prisprognose på sekunder.",
  alternates: { canonical: "/analyseren" },
};

// The analyser speaks in one typeface: Geist, for headlines and numbers alike.
// Components that ask for `font-display`/`font-sans` resolve to it inside here,
// while the site header and footer keep the global type.
const geistScope = {
  "--font-display": "var(--font-geist)",
  "--font-inter": "var(--font-geist)",
} as CSSProperties;

export default function AnalyserenPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
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

        {analyzing && (
          <section aria-labelledby="next-property" className="bg-[#f4f6f9] px-4 py-16 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-[1080px]">
              <h2 id="next-property" className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">
                Analysér en anden bolig.
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
