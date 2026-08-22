import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kom i kontakt med NordInvest — spørgsmål om produktet, salg, presse eller investering.",
};

export default function KontaktPage() {
  return (
    <main>
      <Nav />
      <section className="bg-cream-50 pt-32">
        <div className="container-x max-w-2xl pb-24">
          <p className="micro text-gold-600">Kontakt</p>
          <h1 className="mt-6 text-4xl md:text-6xl">Lad os tale sammen.</h1>
          <p className="mt-5 text-lg text-stone-600">
            Spørgsmål om produktet, salg, presse eller investering — skriv til os,
            så vender vi hurtigt tilbage.
          </p>

          <div className="mt-10 space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="micro text-gold-600">Email</div>
              <a
                href="mailto:hej@nordinvest.io"
                className="mt-2 block font-serif text-xl text-stone-900 hover:text-navy-900"
              >
                hej@nordinvest.io
              </a>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="micro text-gold-600">LinkedIn</div>
              <p className="mt-2 text-stone-600">
                Følg med i opbygningen og skriv direkte.
              </p>
              <Button href="https://www.linkedin.com/" variant="secondary" className="mt-4">
                Åbn LinkedIn
              </Button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
