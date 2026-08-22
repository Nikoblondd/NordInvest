import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PricingCards } from "@/components/PricingCards";
import { Accordion } from "@/components/Accordion";

export const metadata: Metadata = {
  title: "Priser",
  description:
    "Betal for det du bruger. Gratis til 3 analyser om måneden, Starter fra 129 kr/md. Uden binding — opsig når som helst.",
};

const faq = [
  {
    q: "Hvad hvis jeg ikke bruger alle mine analyser?",
    a: "Ubrugte analyser overføres ikke til næste måned. Du kan altid nedgradere, hvis du bruger færre, end du troede.",
  },
  {
    q: "Kan jeg opgradere eller nedgradere når som helst?",
    a: "Ja. Ændringer træder i kraft med det samme, og vi afregner forholdsmæssigt for resten af perioden.",
  },
  {
    q: "Hvor kommer jeres data fra?",
    a: "Prisudvikling bygger på Danmarks Statistiks EJ55-data. Renter afspejler aktuelle realkreditrenter. Alle antagelser er dokumenteret i hver rapport.",
  },
  {
    q: "Er der en gratis prøveperiode?",
    a: "Gratis-planen er permanent gratis — 3 analyser om måneden uden kreditkort. Prøv produktet, før du betaler en krone.",
  },
  {
    q: "Kan jeg afmelde når som helst?",
    a: "Ja. Ingen binding. Du opsiger med ét klik i dine kontoindstillinger og beholder adgang perioden ud.",
  },
  {
    q: "Hvordan betaler jeg?",
    a: "Via Stripe — betalingskort eller MobilePay. Betalingen er sikker, og vi gemmer aldrig dine kortoplysninger selv.",
  },
  {
    q: "Er mine data sikre?",
    a: "Dine analyser er private og knyttet til din konto. Vi sælger ikke data videre. Se privatlivspolitikken for detaljer.",
  },
  {
    q: "Kan jeg få faktura til firmaet?",
    a: "Ja. Pro- og Ubegrænset-planer kan få EAN-faktura. Kontakt os, så sætter vi det op.",
  },
];

export default function PriserPage() {
  return (
    <main>
      <Nav theme="dark" />

      <section className="grain bg-navy-900 pt-32 text-cream-100">
        <div className="container-x pb-20 text-center">
          <p className="micro text-gold-400">Priser</p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl md:text-6xl">
            Betal for det du bruger. Ikke en krone mere.
          </h1>
          <p className="mt-5 text-lg text-cream-100/70">
            Uden binding. Opsig når som helst.
          </p>
        </div>
      </section>

      <section className="bg-cream-50 py-20">
        <div className="container-x">
          <PricingCards theme="light" />
        </div>
      </section>

      <section className="bg-cream-100 py-20">
        <div className="container-x max-w-3xl">
          <h2 className="text-3xl md:text-4xl">Ofte stillede spørgsmål</h2>
          <div className="mt-8">
            <Accordion items={faq} />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
