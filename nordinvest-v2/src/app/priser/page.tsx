import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PricingCards } from "@/components/PricingCards";
import { Accordion } from "@/components/Accordion";

export const metadata: Metadata = {
  title: "Priser",
  description:
    "Gennemsigtige priser for seriøse ejendomsinvestorer. Gratis til 3 analyser om måneden, Starter fra 129 kr/md. Uden binding.",
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
    a: "Prisudvikling bygger på Danmarks Statistiks EJ55-data og offentlige registre som BBR. Renter afspejler aktuelle realkreditrenter. Alle antagelser er dokumenteret i hver analyse.",
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
];

export default function PriserPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />

      <section className="px-6 pt-24 pb-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Gennemsigtige priser for seriøse investorer
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          Vælg den pakke, der passer til dit investeringsniveau. Uden binding — opsig
          når som helst.
        </p>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center">
          <PricingCards />
        </div>
      </section>

      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight">Ofte stillede spørgsmål</h2>
          <div className="mt-8">
            <Accordion items={faq} />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
