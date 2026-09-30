import type { ReactNode } from "react";
import { Testimonials } from "@/components/Testimonials";
import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HeroInput } from "@/components/home/HeroInput";
import { FacadeReveal } from "@/components/home/FacadeReveal";
import { QuestionsDemo } from "@/components/home/QuestionsDemo";
import { FeaturedDeals } from "@/components/home/FeaturedDeals";
import { PricingCards } from "@/components/PricingCards";
import { geist, serif } from "@/components/home/fonts";

export const metadata: Metadata = {
  title: { absolute: "NordInvest · Analyse af ejendomsinvestering i Danmark" },
  description:
    "Analysér ejendomsinvesteringer i Danmark på under et minut: cashflow, afkast, rentestress og en klar vurdering af boligen. Indsæt et boliglink. Gratis at prøve.",
  alternates: { canonical: "/" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Hvad er NordInvest?",
    a: "NordInvest (nordinvest.io) er et dansk analyseværktøj til ejendomsinvestering, bygget af Nikolaj Blond (CVR 44701898). Du indsætter et link fra en boligside eller indtaster tal, og får cashflow, afkast, gældsdækning og en investerings-score på under 60 sekunder, for både boliger og erhvervsejendomme. NordInvest har ingen forbindelse til Nordnet, NORD.investments, Nord-Invest ApS eller Nordinvest AB.",
  },
  {
    q: "Er NordInvest gratis?",
    a: "Du kan prøve 2 analyser uden konto og få 3 om måneden med en gratis konto. Deal-motoren, gemte boliger og prisvagt er gratis. Betalte planer fra 129 kr./md. giver flere analyser, bankrapport og en redigerbar Excel-model.",
  },
  {
    q: "Hvilke nøgletal beregner værktøjet?",
    a: "NordInvest beregner bruttoafkast, nettoafkast (cap rate), kontantafkast (cash-on-cash), månedligt cashflow, DSCR (gældsdækning), break-even-rente, IRR og friværdi over ejerperioden. Derudover laver den en rentestress-test.",
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
    <div className={`mb-10 flex flex-col sm:mb-14 ${center ? "items-start text-left sm:items-center sm:text-center" : "items-start"}`}>
      <p className="mb-4 text-sm font-medium text-blue-700">{eyebrow}</p>
      <h2 className="max-w-3xl font-thesis text-[2.5rem] font-normal leading-[1.06] tracking-[0.005em] text-[#0b1b33] [text-wrap:balance] sm:text-[3.4rem] sm:leading-[1.02] sm:tracking-[-0.01em]">
        {children}
      </h2>
      {lead && <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{lead}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <div className={`${serif.variable} ${geist.variable} min-h-screen overflow-x-clip bg-[#f4f6f9] font-geist text-slate-900`}>
      <Nav />

      {/* Hero: what NordInvest is, in plain words, before any effects. */}
      <section className="drafting-paper px-4 pb-6 pt-14 sm:px-6 sm:pb-10 sm:pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-start text-left sm:items-center sm:text-center">
          <p className="mb-4 text-sm font-medium text-blue-700 sm:mb-5">Analyse af ejendomsinvestering i Danmark</p>
          <h1 className="font-thesis text-[3.1rem] font-normal leading-[1.02] tracking-[0.003em] text-[#0b1b33] [text-wrap:balance] sm:text-[4.4rem] sm:leading-[0.98] sm:tracking-[-0.015em] lg:text-[5.2rem]">
            Se hvad huset tjener, <span className="text-slate-400">før du byder.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-slate-600 sm:mt-6 sm:text-lg">
            NordInvest regner danske boliger igennem for dig, der overvejer at købe til udlejning.
            Sæt et link ind fra en boligside, og få cashflow, afkast og en klar vurdering på under
            et minut.
          </p>
          <div className="mt-8 w-full max-w-xl text-left">
            <HeroInput />
          </div>
          <p className="mt-4 text-sm text-slate-500">
            3 gratis analyser om måneden. Intet kreditkort.{" "}
            <Link href="/analyse-af-ejendomsinvestering" className="font-medium text-blue-700 underline-offset-2 hover:underline">
              Sådan analyserer du en ejendomsinvestering
            </Link>
          </p>
          <ul className="mt-7 flex flex-col gap-2 text-[15px] text-slate-600 sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:text-sm">
            {["Virker med danske boligsider", "Data fra BBR og Danmarks Statistik", "Boliger og erhverv"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3 text-blue-600">
                  <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Then the scanner: an example villa is scanned into its economics. */}
      <FacadeReveal />

      {/* Product demonstration — the analysis as the questions an investor asks. */}
      <section id="analysen" className="border-t border-slate-200/80 bg-white px-4 py-16 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            eyebrow="Analysen"
            lead="Analysen er delt op i de spørgsmål, en erfaren investor stiller. Du får svaret først og tallene bagefter."
          >
            Svar på det, du selv ville <span className="text-slate-400">spørge om.</span>
          </SectionHead>
          <QuestionsDemo />
          <div className="mt-14 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:gap-6">
            <span className="shrink-0 text-sm text-slate-500">Datakilder</span>
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
      <Testimonials className="border-t border-slate-200/80 bg-slate-50 py-16 sm:py-24" />

      <section id="priser" className="border-t border-slate-200/80 bg-white px-4 py-16 sm:px-6 sm:py-28">
        <div className="mx-auto flex max-w-7xl flex-col items-center">
          <SectionHead
            eyebrow="Priser"
            align="center"
            lead="3 analyser om måneden er gratis. Har du brug for flere, kan du opgradere."
          >
            Start gratis.
          </SectionHead>
          <PricingCards />
        </div>
      </section>

      {/* FAQ — native <details>, no fake numbering. */}
      <section id="faq" className="border-t border-slate-200/80 px-4 py-16 sm:px-6 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHead eyebrow="Spørgsmål">
            Det bliver vi <span className="text-slate-400">tit spurgt om.</span>
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
        {/* The blueprint from the opening scene, bleeding off the right edge. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/villa-blueprint.webp"
          alt=""
          aria-hidden
          loading="lazy"
          className="pointer-events-none absolute -right-16 bottom-0 hidden w-[52rem] max-w-none opacity-70 md:block"
          style={{ maskImage: "linear-gradient(to right, transparent, black 35%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 35%)" }}
        />
        <div className="relative mx-auto max-w-6xl">
          <h2 className="max-w-3xl font-thesis text-[2.6rem] font-normal leading-[1.06] tracking-[0.005em] [text-wrap:balance] sm:text-[4rem] sm:leading-[1.02] sm:tracking-[-0.01em]">
            Har du en bolig <span className="text-blue-300">i tankerne?</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-blue-100/80 sm:text-lg">
            Sæt linket ind, så regner vi den igennem. Du kan også taste tallene selv.
          </p>
          <div className="mt-9 max-w-xl">
            <HeroInput />
          </div>
          <p className="mt-4 text-sm text-blue-200/80">3 gratis analyser om måneden. Intet kreditkort.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
