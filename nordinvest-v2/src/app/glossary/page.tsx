import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Ordbog: ejendomsinvestering forklaret",
  description:
    "Ejendomsinvesteringstermer forklaret på dansk: lejeafkast, cash flow, kontantafkast, BRRRR, ARV, LTV, cap rate og value-add med formler og danske eksempler.",
  alternates: { canonical: "https://nordinvest.io/glossary" },
};

const TERMS: { term: string; def: string }[] = [
  { term: "Bruttolejeafkast", def: "Årlig lejeindtægt divideret med boligprisen, angivet i procent. Det centrale rentabilitetstal, som ejendomsfolk bruger — og næsten altid det første tal, du ser på en annonces “afkast”-linje." },
  { term: "Nettolejeafkast", def: "Bruttoafkast minus alle driftsomkostninger — ejendomsskat, forsikring, foreningsudgifter, vedligehold og hensættelse til tomgang. Det tal, der faktisk forudsiger, hvad du beholder." },
  { term: "Afkast (ROI)", def: "Årligt overskud divideret med den kapital, du faktisk har investeret, angivet i procent. Måler hvor effektivt en bolig omsætter den indskudte kapital til indtægt — ikke bare det umiddelbare lejeafkast." },
  { term: "Kontantafkast (cash-on-cash)", def: "Årlig cash flow divideret med den kapital, der reelt stadig er bundet i handlen efter finansiering. Afgørende når man vurderer belånte strategier — især BRRRR, hvor omlægningen frigør det meste af din oprindelige kapital." },
  { term: "BRRRR", def: "Buy, Rehab, Rent, Refinance, Repeat — køb, renovér, udlej, refinansiér, gentag. En strategi der genbruger kapital: køb en nedslidt eller underprisset bolig, renovér den, lej den ud, og læg lånet om til den højere vurdering efter renoveringen for at trække det meste af din kapital ud til næste handel." },
  { term: "ARV (vurdering efter renovering)", def: "Boligens vurderede markedsværdi, efter en planlagt renovering er færdig. Bruges i BRRRR og value-add til at fastsætte størrelsen på det omlagte lån — og til at afgøre, om renoveringsbudgettet kan betale sig." },
  { term: "Belåningsgrad (LTV)", def: "Lånets størrelse som procent af boligens værdi. En omlægning på 75 % belåningsgrad af en ARV på 500.000 kr giver et lån på 375.000 kr. Nordisk standard for ejerboliger er 80–95 %; ved omlægning af investeringsboliger typisk 70–80 %." },
  { term: "Cap rate (afkastningsgrad)", def: "Nettodriftsindtægt (NOI) divideret med boligværdi, angivet i procent. Erhvervsejendommenes fætter til nettolejeafkast, brugt til at sammenligne indtægtsejendomme på tværs af aktivklasser." },
  { term: "Cash flow (månedlig)", def: "Leje minus ydelse minus alle driftsudgifter, opgjort pr. måned. Positiv cash flow er indtægt, du beholder; negativ cash flow er penge, du skyder ind i boligen hver måned." },
  { term: "Værdistigning", def: "Stigning i boligens værdi over tid, angivet som en årlig procent. Den dominerende afkastmotor i nordiske og europæiske storbyer med begrænset udbud, hvor afkastet presses under 4 %." },
  { term: "Formuemotor", def: "Den mekanisme, hvormed en bolig skaber afkast. NordInvest vurderer fire motorer i hver analyse: cashflow, BRRRR, værdistigning og value-add." },
  { term: "Rentestresstest", def: "Genberegning af den månedlige cash flow ved hypotetisk højere renter — typisk +1 % og +2 % over den nuværende rente — for at se, om investeringen overlever et rentechok. Standardtesten for enhver belånt handel." },
  { term: "Udbetaling (egenkapital)", def: "Den del af boligens købspris, der betales kontant, mens resten finansieres med et lån. Nordisk standard for ejerboliger er 5–20 %, for investeringsboliger typisk 20–25 %." },
  { term: "Value-add", def: "En strategi, der fremtvinger værdistigning via bestemte løftestænger: renovering for at hæve lejen, ombygning af en enfamiliesbolig til to lejligheder, skift af anvendelse eller opdeling af en stor enhed. Afkastet kommer fra dit arbejde, ikke fra markedsvind." },
];

export default function GlossaryPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "NordInvest ordbog — ejendomsinvesteringstermer",
    hasDefinedTerm: TERMS.map((t) => ({ "@type": "DefinedTerm", name: t.term, description: t.def })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <section className="px-6 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Ordbog</p>
          <h1 className="mt-4 text-[2rem] font-bold leading-[1.12] tracking-tight [hyphens:auto] sm:text-5xl">
            Ejendomsinvesteringstermer forklaret
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            De begreber, der går igen i enhver ejendomsanalyse — på dansk, med formler og eksempler.
            Alle bruges direkte i NordInvests analyseværktøj.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-4">
          {TERMS.map((t) => (
            <div key={t.term} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">{t.term}</h2>
              <p className="mt-2 leading-relaxed text-slate-600">{t.def}</p>
            </div>
          ))}

          <div className="rounded-3xl bg-slate-900 p-8 text-white md:p-10">
            <h2 className="text-2xl font-bold tracking-tight">Se begreberne i praksis</h2>
            <p className="mt-3 max-w-xl text-slate-300">
              Indsæt et boliglink, og se lejeafkast, cash flow, DSCR og value-add regnet ud på en
              konkret ejendom.
            </p>
            <Link href="/analyseren" className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Åbn analyseren →
            </Link>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/methodology" className="text-blue-300 hover:text-blue-200">Metode &amp; datakilder →</Link>
              <Link href="/investment-models" className="text-blue-300 hover:text-blue-200">Investeringsstrategier →</Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
