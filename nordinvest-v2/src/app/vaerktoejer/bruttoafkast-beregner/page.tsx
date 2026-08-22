import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { BruttoafkastCalc } from "@/components/tools/BruttoafkastCalc";

export const metadata: Metadata = {
  title: "Bruttoafkast-beregner",
  description:
    "Beregn bruttolejeafkast på en dansk ejendom ud fra købspris og månedlig leje. Gratis og uden login.",
};

export default function Page() {
  return (
    <main>
      <Nav />
      <section className="bg-cream-50 pt-32">
        <div className="container-x pb-8">
          <Link href="/vaerktoejer" className="text-sm text-gold-600 hover:text-gold-500">
            ← Alle værktøjer
          </Link>
          <h1 className="mt-6 max-w-3xl text-4xl md:text-5xl">Bruttoafkast-beregner</h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">
            Bruttolejeafkastet viser lejeindtægten i forhold til prisen — det
            første tal enhver investor kigger på.
          </p>
        </div>
      </section>
      <section className="bg-cream-50 pb-24">
        <div className="container-x">
          <BruttoafkastCalc />
        </div>
      </section>
      <Footer />
    </main>
  );
}
