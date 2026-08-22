import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Gratis værktøjer til ejendomsinvestering",
  description:
    "Gratis beregnere til danske ejendomsinvestorer: bruttoafkast, realkredit-ydelse og mere. Ingen login.",
};

const tools = [
  {
    href: "/vaerktoejer/bruttoafkast-beregner",
    name: "Bruttoafkast-beregner",
    desc: "Beregn bruttolejeafkast på sekunder ud fra pris og leje.",
  },
  {
    href: "/vaerktoejer/laaneberegner",
    name: "Realkredit-låneberegner",
    desc: "Månedlig ydelse og samlede renteudgifter for dit lån.",
  },
];

export default function VaerktoejerPage() {
  return (
    <main>
      <Nav />
      <section className="bg-cream-50 pt-32">
        <div className="container-x pb-10">
          <p className="micro text-gold-600">Værktøjer</p>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-6xl">
            Gratis beregnere til din næste handel.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">
            Hurtige svar på enkeltspørgsmål. Vil du have hele dommen, så brug{" "}
            <Link href="/analyseren" className="text-gold-600 underline underline-offset-2">
              Analyseren
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-cream-50 pb-24">
        <div className="container-x grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group rounded-2xl border border-stone-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-xl"
            >
              <h2 className="text-xl group-hover:text-navy-900">{t.name}</h2>
              <p className="mt-2 text-stone-600">{t.desc}</p>
              <span className="mt-4 inline-block text-sm text-gold-600">
                Åbn beregner →
              </span>
            </Link>
          ))}
          <Link
            href="/analyseren"
            className="group flex flex-col justify-center rounded-2xl border border-dashed border-navy-900/30 bg-navy-900 p-8 text-cream-100 transition-colors hover:bg-navy-800"
          >
            <h2 className="text-xl">Fuld ejendomsanalyse</h2>
            <p className="mt-2 text-cream-100/70">
              Score, cash flow, rentestress og 5-årig prognose i én rapport.
            </p>
            <span className="mt-4 inline-block text-sm text-gold-400">
              Åbn Analyseren →
            </span>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
