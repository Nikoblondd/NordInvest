import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HeroInput } from "@/components/home/HeroInput";
import { FacadeReveal } from "@/components/home/FacadeReveal";
import { QuestionsDemo } from "@/components/home/QuestionsDemo";
import { FeaturedDeals } from "@/components/home/FeaturedDeals";
import { PricingCards } from "@/components/PricingCards";
import { drafting, serif } from "@/components/home/fonts";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Hvad er NordInvest?",
    a: "NordInvest er et dansk analyseværktøj til ejendomsinvestering. Du indsætter et link fra en boligside eller indtaster tal, og får cashflow, afkast, ROI, DSCR og en objektiv investerings-score på under 60 sekunder — for både boliger og investerings-/erhvervsejendomme.",
  },
  {
    q: "Er NordInvest gratis?",
    a: "Ja, du kan analysere ejendomme gratis uden oprettelse. Betalte planer giver flere analyser om måneden og ekstra funktioner som deal-motoren over hele markedet, overvågning og bankrapporter.",
  },
  {
    q: "Hvilke nøgletal beregner værktøjet?",
    a: "NordInvest beregner bruttoafkast, nettoafkast (cap rate), kontantafkast (cash-on-cash), månedligt cashflow, DSCR (gældsdækning), break-even-rente, IRR og friværdi over ejerperioden — plus en rentestress-test.",
  },
  {
    q: "Bruger NordInvest AI?",
    a: "Ja. Ud over de klassiske beregninger har NordInvest en AI-analytiker, der forklarer tallene og forholder sig kritisk til handlen, samt AI-fotoanalyse af ejendommens stand. Modellen kalibreres løbende med faktiske handler.",
  },
  {
    q: "Kan NordInvest bruges til investerings- og erhvervsejendomme?",
    a: "Ja. Deal-motoren dækker både boligudlejning og erhvervs-/investeringsejendomme fra hele det danske marked, og analysen tilpasser nøgletallene til ejendomstypen.",
  },
  {
    q: "Er NordInvest finansiel rådgivning?",
    a: "Nej. NordInvest leverer beregninger og beslutningsstøtte til oplysningsformål og er ikke personlig finansiel eller investeringsmæssig rådgivning. Søg altid professionel rådgivning inden større investeringer.",
  },
];

const SOURCES = [
  "BBR via Datafordeler",
  "Danmarks Statistik",
  "Plandata.dk",
  "DAWA-adresser",
  "Aktive boligannoncer",
];

function SectionHead({
  eyebrow,
  children,
  lead,
  align = "left",
}: {
  eyebrow: string;
  children: ReactNode;
  lead?: string;
  align?: "left" | "center";
}) {
  const center = align === "center";
  return (
    <div className={`mb-10 flex flex-col sm:mb-14 ${center ? "items-center text-center" : "items-start"}`}>
      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 backdrop-blur">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-blue-600" style={{ boxShadow: "0 0 0 3px rgba(37,99,235,.15)" }} />
        {eyebrow}
      </div>
      <h2 className="max-w-3xl font-thesis text-[2.1rem] font-normal leading-[1.05] tracking-[-0.02em] text-[#0b1b33] [text-wrap:balance] sm:text-5xl">
        {children}
      </h2>
      {lead && <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{lead}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <div className={`${serif.variable} ${drafting.variable} min-h-screen overflow-x-clip bg-[#f4f6f9] text-slate-900`}>
      <Nav />

      {/* Opening scene: the facade is scanned into its economics. */}
      <FacadeReveal />

      {/* Product demonstration — the analysis as the questions an investor asks. */}
      <section id="analysen" className="border-t border-slate-200/80 bg-white px-4 py-16 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="Analysen"
            lead="Hver analyse er bygget som de spørgsmål, en erfaren investor stiller — med et kort svar øverst og beviset nedenunder."
          >
            Fem spørgsmål, <em className="text-blue-700">du ville stille selv.</em>
          </SectionHead>
          <QuestionsDemo />
          <div className="mt-14 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:gap-6">
            <span className="shrink-0 font-drafting text-[11px] uppercase tracking-[0.14em] text-slate-500">
              Bygget på
            </span>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-700">
              {SOURCES.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <span aria-hidden className="h-1 w-1 rounded-full bg-slate-400" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Featured deals — the Deal-motor showcase */}
      <FeaturedDeals />

      {/* Pricing */}
      <section id="priser" className="border-t border-slate-200/80 bg-white px-4 py-16 sm:px-6 sm:py-28">
        <div className="mx-auto flex max-w-7xl flex-col items-center">
          <SectionHead
            eyebrow="Priser"
            align="center"
            lead="Start gratis. Opgrader, når du analyserer mere end et par boliger om måneden."
          >
            Betal for det, <em className="text-blue-700">du faktisk bruger.</em>
          </SectionHead>
          <PricingCards />
        </div>
      </section>

      {/* FAQ — native <details>, no fake numbering. */}
      <section id="faq" className="border-t border-slate-200/80 px-4 py-16 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHead eyebrow="Spørgsmål" lead="Det, folk oftest spørger om, inden de bruger NordInvest.">
            Før din <em className="text-blue-700">første analyse.</em>
          </SectionHead>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {FAQS.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-semibold tracking-[-0.01em] text-slate-900 sm:text-[17px] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-transform duration-300 group-open:rotate-45 group-open:text-blue-600"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 1 v10 M1 6 h10" />
                    </svg>
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 pr-10 leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      </section>

      {/* Closing — back to the blueprint. */}
      <section className="relative overflow-hidden bg-[#0b2350] px-4 py-20 text-white sm:px-6 sm:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(141,184,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(141,184,255,0.09) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <svg
          aria-hidden
          viewBox="0 0 640 300"
          className="pointer-events-none absolute -right-24 bottom-0 hidden w-[46rem] opacity-60 md:block"
          fill="none"
          stroke="#8db8ff"
          strokeWidth="1.2"
        >
          <path d="M132 112h376v140H132zM108 116h424l-62-118H170z" />
          <path d="M282 30h76v62h-76zM272 36h96l-48-32z" strokeOpacity="0.7" />
          {[156, 224, 360, 428].map((x) => (
            <rect key={x} x={x} y="142" width="56" height="66" strokeOpacity="0.7" />
          ))}
          <path d="M302 162h36v90h-36z" strokeOpacity="0.7" />
          <path d="M40 252h560" strokeWidth="1.6" />
          <path d="M136 252h368v34H136z" strokeDasharray="5 4" strokeOpacity="0.6" />
        </svg>
        <div className="relative mx-auto max-w-6xl">
          <h2 className="max-w-3xl font-thesis text-[2.3rem] font-normal leading-[1.04] tracking-[-0.02em] [text-wrap:balance] sm:text-6xl">
            Næste gang du står foran en facade, <em className="text-blue-300">ved du, hvad der står bag.</em>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-blue-100/80 sm:text-lg">
            Indsæt et link fra en dansk boligside, eller tast tallene selv. Du får hele
            regnestykket på under et minut.
          </p>
          <div className="mt-9 max-w-xl">
            <HeroInput />
          </div>
          <p className="mt-4 font-drafting text-[11px] uppercase tracking-[0.14em] text-blue-200/70">
            3 gratis analyser om måneden · intet kreditkort
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
