import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AnalyzerApp } from "@/components/analyzer/AnalyzerApp";

export const metadata: Metadata = {
  title: "Analysér enhver dansk ejendom",
  description:
    "Indsæt tallene, få dommen. Bruttoafkast, cash flow, kontantafkast, rentestress-test og 5-årig prisprognose — beregnet på sekunder.",
};

export default function AnalyserenPage() {
  return (
    <main>
      <Nav />
      <section className="bg-cream-50 pt-32">
        <div className="container-x">
          <p className="micro text-gold-600">Analyseren</p>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-6xl">
            Analysér enhver dansk ejendom.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">
            Indsæt tallene. Få dommen. Beslut. Resultatet opdaterer sig, mens du
            skriver.
          </p>
        </div>
      </section>

      <section className="bg-cream-50 py-12">
        <div className="container-x">
          <AnalyzerApp />
        </div>
      </section>

      <Footer />
    </main>
  );
}
