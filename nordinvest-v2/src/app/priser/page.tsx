import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PricingCards } from "@/components/PricingCards";
import { Accordion } from "@/components/Accordion";

export const metadata: Metadata = {
  title: "Priser: gratis og betalte planer",
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
    a: "Bygningsdata (byggeår, areal, opvarmning) kommer fra BBR via Datafordeler. Prisudvikling bygger på Danmarks Statistiks EJ55 (realiserede salgspriser). Markedspris pr. m² bygger på vores egen indsamling af udbudte annoncer. Renten er dit eget input — vi anbefaler at bruge din bank eller realkreditinstituts aktuelle tilbud. Hvert tal i analysen mærkes som Dokumenteret, Estimat eller Skal undersøges.",
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

          {/* Erhverv / B2B — sales-led, distinct from the self-serve tiers */}
          <div className="mt-8 w-full overflow-hidden rounded-3xl bg-slate-900 p-8 text-white md:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="lg:max-w-xl">
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">Erhverv & teams</div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                  NordInvest til mæglere, fonde og investeringsteams
                </h2>
                <p className="mt-3 text-slate-300">
                  Screener du markedet i stor skala? Erhverv giver hele teamet ubegrænset adgang, hele
                  investerings- og erhvervsmarkedet i deal-motoren, dataeksport og en aftale skræddersyet til jer.
                </p>
                <ul className="mt-5 grid gap-x-8 gap-y-2 text-sm text-slate-200 sm:grid-cols-2">
                  {[
                    "Ubegrænsede analyser til hele teamet",
                    "Deal-motor på tværs af hele markedet",
                    "Investeringsejendomme & erhverv",
                    "Data- og Excel-eksport i stor skala",
                    "Dedikeret onboarding og support",
                    "Fælles portefølje og vagter",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-blue-400" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0">
                <Link
                  href="/kontakt?emne=erhverv"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-colors hover:bg-blue-500"
                >
                  Kontakt os om en aftale <ArrowRight size={16} />
                </Link>
                <p className="mt-3 text-center text-xs text-slate-400">Skræddersyet pris · uden binding</p>
              </div>
            </div>
          </div>
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
