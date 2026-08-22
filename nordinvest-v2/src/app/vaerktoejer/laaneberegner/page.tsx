import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { LaanCalc } from "@/components/tools/LaanCalc";

export const metadata: Metadata = {
  title: "Realkredit-låneberegner",
  description:
    "Beregn månedlig ydelse og samlede renteudgifter på et realkreditlån. Gratis låneberegner for danske boliginvestorer.",
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
          <h1 className="mt-6 max-w-3xl text-4xl md:text-5xl">Realkredit-låneberegner</h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">
            Se den månedlige ydelse og hvor meget du samlet betaler i renter over
            lånets løbetid.
          </p>
        </div>
      </section>
      <section className="bg-cream-50 pb-24">
        <div className="container-x">
          <LaanCalc />
        </div>
      </section>
      <Footer />
    </main>
  );
}
