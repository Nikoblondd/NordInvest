import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DealFinder } from "@/components/deals/DealFinder";

export const metadata: Metadata = {
  title: "Deal-motor — find de bedste ejendomsinvesteringer i Danmark",
  description:
    "Scan hele det danske boligmarked på tværs af EDC, Home, Nybolig, Danbolig og flere. NordInvests deal-motor analyserer hver bolig og rangerer de bedste investeringer efter cash flow, afkast og score.",
  alternates: { canonical: "/deals" },
};

export default function DealsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">Deal-motor</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Find de bedste handler i hele Danmark.
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:mt-3 sm:text-base">
            Vi scanner hele markedet — boliger fra EDC, Home, Nybolig og Danbolig, samt
            investeringsejendomme fra Ejendomstorvet — og rangerer dem efter hvad de reelt
            kan som investering.
          </p>
        </div>

        <div className="mt-5 sm:mt-8">
          <DealFinder />
        </div>
      </main>
      <Footer />
    </div>
  );
}
