import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Check, Database, Mail, Phone, ShieldCheck } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PricingCards } from "@/components/PricingCards";
import { Accordion } from "@/components/Accordion";
import { site } from "@/lib/site";
import { Testimonials } from "@/components/Testimonials";

export const metadata: Metadata = {
  title: "Priser: gratis og betalte planer",
  description:
    "Start gratis med 3 analyser om måneden. Starter fra 107,50 kr./md. ved årlig betaling, med bankrapport og Excel-model. Opsig med ét klik.",
};

const faq = [
  {
    q: "Hvad får jeg med en betalt plan?",
    a: "Flere analyser om måneden, bankrapporten til dit møde om finansieringen, den redigerbare Excel-model og hele Deal-motoren: alle handler, kortet, de avancerede filtre og Deal-vagt. Gratis-planen giver adgang til hele analysen, de 10 bedste handler i hver Deal-motor-søgning og gemte boliger.",
  },
  {
    q: "Hvordan virker årlig betaling?",
    a: "Du betaler for 12 måneder på én gang og får 2 måneder gratis: Starter koster 1.290 kr. om året (107,50 kr. om måneden) i stedet for 1.548 kr., og Pro 3.490 kr. i stedet for 4.200 kr. Abonnementet fornyes efter et år. Du kan opsige når som helst før fornyelsen og beholder adgangen året ud.",
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
  forbrug: "Du er ved at løbe tør for analyser i denne måned. Pro giver ubegrænsede analyser med det samme.",
  report: "Bankrapporten er med i alle betalte planer, fra Starter til 129 kr./md.",
  excel: "Excel-modellen er med i alle betalte planer, fra Starter til 129 kr./md.",
};

const FIT = [
  { who: "Kigger du på en bolig i ny og næ", plan: "Gratis", why: "3 fulde analyser om måneden er nok til at vurdere en konkret bolig." },
  { who: "Leder du aktivt efter din næste bolig", plan: "Starter", why: "10 analyser om måneden, og bankrapporten, når du skal til møde om finansieringen." },
  { who: "Screener du flere boliger hver uge", plan: "Pro", why: "Ubegrænsede analyser, så du kan regne alt igennem, du overvejer, uden at tælle." },
];

export default function PriserPage({ searchParams }: { searchParams?: { fra?: string } }) {
  const context = searchParams?.fra ? CONTEXT[searchParams.fra] : undefined;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Nav />

      <section className="px-6 pt-24 pb-16 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Køb den rigtige bolig. Spring de dårlige over.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          En udlejningsbolig med 2.000 kr. i minus om måneden koster dig 24.000 kr. om året. NordInvest viser
          det, før du byder. Start gratis, og betal først, når du regner på flere boliger.
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

          {/* Who is behind it: visitors went from here to "Om os" before deciding. */}
          <div className="mt-12 grid w-full max-w-5xl gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-8 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-10">
            <div className="min-w-0">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={site.founder.photo} alt={site.founder.name} width={80} height={80} className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-slate-200 sm:h-20 sm:w-20" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-blue-700">Hvem står bag?</p>
                  <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.01em] text-slate-900">{site.founder.name}</p>
                </div>
              </div>
              <p className="mt-4 max-w-md text-[16px] leading-relaxed text-slate-600">
                Jeg har bygget NordInvest i Danmark. Har du spørgsmål, før du vælger en plan, så ring eller skriv direkte til mig.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <a href={site.phoneHref} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[15px] font-semibold text-white hover:bg-slate-800">
                  <Phone size={16} strokeWidth={1.8} /> <span className="sm:hidden">Ring</span><span className="hidden sm:inline">{site.phone}</span>
                </a>
                <a href={`mailto:${site.email}`} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-[15px] font-semibold text-slate-900 hover:border-slate-400">
                  <Mail size={16} strokeWidth={1.8} /> Skriv til mig
                </a>
              </div>
            </div>
            <dl className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-5 md:border-l-0">
              {[
                { Icon: Building2, k: "Dansk virksomhed", v: `${site.business.legalName}, CVR\u00a0${site.business.cvr}` },
                { Icon: Database, k: "Offentlige data", v: "BBR og vurderinger fra Datafordeler, Danmarks Statistik og Boligsiden" },
                { Icon: ShieldCheck, k: "Ingen binding", v: "Opsig med ét klik. Sikker betaling via Stripe" },
              ].map(({ Icon, k, v }) => (
                <div key={k} className="flex gap-3 py-3.5">
                  <Icon size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <dt className="text-[15px] font-semibold text-slate-900">{k}</dt>
                    <dd className="text-[14px] leading-snug text-slate-600">{v}</dd>
                  </div>
                </div>
              ))}
              <div className="py-3.5 pl-[30px]">
                <Link href="/om" className="text-[15px] font-semibold text-blue-700 underline-offset-2 hover:underline">Læs mere om os</Link>
              </div>
            </dl>
          </div>

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
