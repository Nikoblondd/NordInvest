import type { Metadata } from "next";
import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AnalyzerApp } from "@/components/analyzer/AnalyzerApp";
import { HeroInput } from "@/components/home/HeroInput";

export const metadata: Metadata = {
  title: "Analysér enhver dansk ejendom",
  description:
    "Indsæt et boliglink fra Boligsiden, EDC, Ejendomstorvet eller enhver dansk side. Få bruttoafkast, cash flow, rentestress-test og 5-årig prisprognose på sekunder.",
};

export default function AnalyserenPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <Nav />
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

      <section className="px-4 py-10 sm:px-6 sm:py-12">
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
