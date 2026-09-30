import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PricingCards } from "@/components/PricingCards";
import { Accordion } from "@/components/Accordion";
import { site } from "@/lib/site";
import { Testimonials } from "@/components/Testimonials";

export const metadata: Metadata = {
  title: "Priser: gratis og betalte planer",
  description:
    "Start gratis med 3 analyser om måneden. Starter fra 129 kr./md. med bankrapport og Excel-model. Uden binding, opsig med ét klik.",
};

const faq = [
  {
    q: "Hvad får jeg med en betalt plan?",
    a: "Flere analyser om måneden, bankrapporten til dit møde om finansieringen og den redigerbare Excel-model. Gratis-planen giver adgang til hele analysen, Deal-motoren, gemte boliger og prisvagt.",
  },
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

// Arriving from an upgrade prompt: say why they're here, in their words.
const CONTEXT: Record<string, string> = {
  graense: "Du har brugt dine 3 gratis analyser i denne måned. Starter giver dig 10 og låser analysen op med det samme.",
  forbrug: "Du er ved at løbe tør for analyser i denne måned. En større plan giver dig flere med det samme.",
  report: "Bankrapporten er med i alle betalte planer, fra Starter til 129 kr./md.",
  excel: "Excel-modellen er med i alle betalte planer, fra Starter til 129 kr./md.",
};

const FIT = [
  { who: "Kigger du på en bolig i ny og næ", plan: "Gratis", why: "3 fulde analyser om måneden er nok til at vurdere en konkret bolig." },
  { who: "Leder du aktivt efter din næste bolig", plan: "Starter", why: "10 analyser om måneden, og bankrapporten, når du skal til møde om finansieringen." },
  { who: "Screener du flere boliger hver uge", plan: "Pro eller Ubegrænset", why: "Nok analyser til at regne alt igennem, du overvejer, uden at tælle." },
];

export default function PriserPage({ searchParams }: { searchParams?: { fra?: string } }) {
  const context = searchParams?.fra ? CONTEXT[searchParams.fra] : undefined;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />

      <section className="px-6 pt-24 pb-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Gennemsigtige priser for seriøse investorer
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          Start gratis med 3 analyser om måneden. Betal først, når du regner på flere boliger,
          eller når du skal i banken med tallene.
        </p>
        {context && (
          <p role="status" className="mx-auto mt-6 max-w-xl rounded-2xl bg-blue-50 px-5 py-3.5 text-[15px] font-medium text-blue-900 ring-1 ring-inset ring-blue-100">
            {context}
          </p>
        )}
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center">
          <PricingCards />
          <p className="mt-8 text-center text-sm text-slate-500">
            Uden binding · Opsig med ét klik · Sikker betaling via Stripe · {site.business.legalName}, CVR {site.business.cvr}
          </p>

          <div className="mt-16 w-full">
            <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Hvilken plan passer til dig?</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {FIT.map((f) => (
                <div key={f.plan} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-sm text-slate-500">{f.who}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{f.plan}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{f.why}</p>
                </div>
              ))}
            </div>
          </div>

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

      <Testimonials className="pb-24" />

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
