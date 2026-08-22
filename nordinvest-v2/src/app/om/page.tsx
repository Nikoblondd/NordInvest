import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Om NordInvest",
  description:
    "NordInvest bygges af én person, i offentligt lys — for at gøre ejendomsdata tilgængeligt for alle danske investorer, ikke kun dem der har råd til en rådgiver.",
};

export default function OmPage() {
  return (
    <main>
      <Nav />
      <article className="bg-cream-50 pt-32">
        <div className="container-x max-w-3xl pb-24">
          <p className="micro text-gold-600">Om NordInvest</p>
          <h1 className="mt-6 text-4xl md:text-6xl">
            Bygget af én person. For en hel branche.
          </h1>

          <div className="mt-10 space-y-6 text-lg leading-relaxed text-stone-700">
            <p>
              NordInvest startede med ét spørgsmål: Hvorfor tager det så lang tid
              at finde ud af, om en ejendom er en god investering?
            </p>
            <p>
              Jeg hedder Nikolaj. Jeg bygger NordInvest, fordi jeg mener, at data
              burde være tilgængeligt for alle — ikke kun dem, der kan betale
              15.000 kr for en analyserapport.
            </p>
            <p>
              Jeg så investorer bruge hele weekender i det samme regneark for at
              vurdere én ejendom. Jeg så begyndere, der ikke turde tage springet,
              fordi tallene virkede uigennemsigtige. Og jeg så et marked, hvor de
              bedste værktøjer var forbeholdt professionelle.
            </p>
            <p>
              Målet er en dansk ejendomsplatform, der udligner spillefeltet. Ikke
              bare et værktøj — men et startpunkt for en generation, der investerer
              smartere end den forrige.
            </p>
          </div>

          <div className="mt-12">
            <Button href="https://www.linkedin.com/">Følg rejsen på LinkedIn →</Button>
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}
