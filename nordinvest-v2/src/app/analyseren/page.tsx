import type { Metadata } from "next";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AnalyzerApp } from "@/components/analyzer/AnalyzerApp";
import { HeroInput } from "@/components/home/HeroInput";

export const metadata: Metadata = {
  title: "Analysér din ejendomsinvestering – enhver dansk bolig",
  description:
    "Gratis analyse af ejendomsinvestering i Danmark: indsæt et boliglink og få bruttoafkast, cash flow, rentestress-test og 5-årig prisprognose på sekunder.",
  alternates: { canonical: "/analyseren" },
};

export default function AnalyserenPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // With a property loaded, the marketing header gets out of the way so the
  // verdict is the first thing on screen.
  const analyzing = !!(searchParams.url || searchParams.price || searchParams.saved);

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Nav />
      {analyzing ? (
        <section className="px-4 pt-6 sm:px-6 sm:pt-8">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Analyseren</p>
              <h1 className="font-display text-2xl font-bold tracking-[-0.025em] sm:text-3xl">
                Din analyse er klar.
              </h1>
            </div>
            <div className="w-full min-w-0 lg:max-w-2xl">
              <HeroInput />
            </div>
          </div>
        </section>
      ) : (
        <section className="px-4 pt-20 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-[1440px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Analyseren
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:mt-4 sm:text-4xl md:text-6xl">
              Analysér enhver dansk ejendom.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600 sm:mt-4 sm:text-lg">
              Indsæt et link fra Boligsiden, EDC, Ejendomstorvet — eller enhver dansk
              boligside. Vi henter tallene, du får dommen på sekunder.
            </p>
            <div className="mt-6 flex justify-start sm:mt-8">
              <HeroInput />
            </div>
          </div>
        </section>
      )}

      <section className={analyzing ? "px-4 pb-10 pt-6 sm:px-6 sm:pb-12" : "px-4 py-10 sm:px-6 sm:py-12"}>
        <div className="mx-auto max-w-[1440px]">
          <Suspense fallback={null}>
            <AnalyzerApp />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  );
}
