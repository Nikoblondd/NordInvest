import { CheckCircle2 } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HeroInput } from "@/components/home/HeroInput";
import { Timeline } from "@/components/home/Timeline";
import { FeaturedDeals } from "@/components/home/FeaturedDeals";
import { PricingCards } from "@/components/PricingCards";

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

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <Nav />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-6 pb-20 pt-16 text-center sm:pb-32 sm:pt-24">
        {/* subtle textured backdrop — a soft top wash, not the AI-signature
            radial-ellipse-from-blue-100 gradient. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(37,99,235,0.05) 0%, rgba(248,250,252,0) 60%)",
          }}
        />

        <div className="mx-auto flex max-w-4xl flex-col items-center">
          {/* Refined eyebrow — small caps, uppercase, tight letterspacing.
              A typographic detail, not a pulsing pill. */}
          <div className="mb-8 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700/90">
            <span aria-hidden className="h-px w-6 bg-blue-600/50" />
            <span>Dansk ejendomsanalyse</span>
          </div>

          <h1 className="mb-6 text-[2rem] font-bold leading-[1.06] tracking-[-0.028em] text-slate-900 [hyphens:auto] sm:text-5xl md:text-[4.25rem]">
            Analyser ejendomsinvesteringer på{" "}
            <span className="relative whitespace-nowrap text-blue-700">
              under 60 sekunder
              {/* A hand-drawn feeling swash underneath — SVG so it hugs the
                  baseline and doesn't wrap awkwardly like `text-decoration`. */}
              <svg
                aria-hidden
                viewBox="0 0 520 12"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-2.5 w-full text-blue-600/45"
              >
                <path
                  d="M2 8 C 80 3, 180 3, 260 6 S 440 9, 518 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="mb-10 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg md:text-xl">
            Indsæt et link fra en dansk boligside. Få beregnet cashflow, afkast,
            rentestress-test og en klar dom. Slut med at bruge timer i tunge Excel-ark
            for én ejendom.
          </p>

          <HeroInput />

          <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle2 size={16} className="text-emerald-500" />
            3 gratis analyser om måneden — kræver intet kreditkort
          </p>
        </div>
      </section>

      {/* Featured deals — the Deal-motor showcase */}
      <FeaturedDeals />

      {/* How it works */}
      <section id="hvordan" className="relative overflow-hidden bg-white px-6 py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.06), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-14 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 backdrop-blur">
              <span aria-hidden className="h-1 w-1 rounded-full bg-blue-500" />
              Sådan virker det
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Fra boliglink til investeringsdom{" "}
              <span className="text-slate-400">på sekunder.</span>
            </h2>
            <p className="mt-3 max-w-xl text-lg text-slate-500">
              Fem trin. Ét flow. Ingen regneark.
            </p>
          </div>
          <Timeline />
        </div>
      </section>

      {/* Pricing */}
      <section id="priser" className="relative overflow-hidden bg-slate-50 px-6 py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[70%] opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.08), transparent 60%)",
          }}
        />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center">
          <div className="mb-14 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 backdrop-blur">
              <span aria-hidden className="h-1 w-1 rounded-full bg-blue-500" />
              Priser
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Klare priser for seriøse investorer
            </h2>
            <p className="mt-3 max-w-xl text-lg text-slate-500">
              Vælg den plan, der passer til, hvor tit du analyserer.
            </p>
          </div>
          <PricingCards />
        </div>
      </section>

      {/* FAQ — real accordion component, native <details>. Cards have hover +
          open state so the section reads like a live product, not a printout. */}
      <section id="faq" className="relative overflow-hidden bg-white px-6 py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, rgba(59,130,246,0.06), transparent 40%), radial-gradient(circle at 80% 100%, rgba(16,185,129,0.05), transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 backdrop-blur">
              <span aria-hidden className="h-1 w-1 rounded-full bg-blue-500" />
              FAQ
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Ofte stillede spørgsmål
            </h2>
            <p className="mt-3 max-w-xl text-lg text-slate-500">
              Det, folk oftest spørger om, inden de bruger NordInvest.
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-slate-200/80 bg-white transition-all duration-300 open:border-blue-200 open:shadow-card-lift hover:border-slate-300"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(15,23,42,0.03), 0 1px 3px rgba(15,23,42,0.04)",
                }}
              >
                <summary className="flex cursor-pointer list-none items-start gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-50 font-mono text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 group-open:bg-blue-50 group-open:text-blue-700 group-open:ring-blue-200 tabular-nums"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-base font-semibold tracking-[-0.01em] text-slate-900 sm:text-lg">
                    {f.q}
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition-transform duration-300 group-open:rotate-45 group-open:text-blue-600"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 1 v10 M1 6 h10" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 pl-[calc(1.25rem+1.5rem+1rem)] text-slate-600 sm:px-6 sm:pb-6 sm:pl-[calc(1.5rem+1.5rem+1rem)]">
                  <div className="border-t border-slate-100 pt-4 leading-relaxed">
                    {f.a}
                  </div>
                </div>
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

      <Footer />
    </div>
  );
}
