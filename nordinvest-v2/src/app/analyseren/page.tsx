import type { Metadata } from "next";
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Analyseren
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Analysér enhver dansk ejendom.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Indsæt et link fra Boligsiden, EDC, Ejendomstorvet — eller enhver dansk
            boligside. Vi henter tallene, du får dommen på sekunder.
          </p>
          <div className="mt-8 flex justify-start">
            <HeroInput />
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <AnalyzerApp />
        </div>
      </section>

      <Footer />
    </div>
  );
}
