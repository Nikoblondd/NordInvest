import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Investeringsstrategier for ejendom forklaret",
  description:
    "De fire investeringsstrategier for ejendom forklaret: cashflow, BRRRR, værdistigning og value-add — med formler, eksempler og danske markedsvurderinger.",
  alternates: { canonical: "https://nordinvest.io/investment-models" },
};

const MODELS = [
  {
    name: "Cashflow-model",
    tag: "Månedlig leje − ydelse − udgifter = indtægt",
    body: [
      "Den grundlæggende model — og standarden for enhver analyse af en udlejningsbolig. Lejen kommer ind, ydelse og driftsomkostninger går ud, og det, der er tilbage, er din månedlige indtægt.",
      "Cashflow-investorer prioriterer positiv likviditet fra dag ét og trives bedst i markeder med højere afkast (Fyn, jyske og fynske provinsbyer).",
    ],
    method: "Metode: standardanalyse af boligudlejning, jf. Brandon Turner, The Book on Rental Property Investing (BiggerPockets, 2015).",
  },
  {
    name: "BRRRR-model",
    tag: "Køb · Renovér · Udlej · Refinansiér · Gentag",
    body: [
      "Strategien der genbruger din kapital. Køb en nedslidt eller underprisset bolig, renovér den, lej den ud, og læg lånet om til den nye (højere) vurdering for at trække det meste af din oprindelige kapital ud igen.",
      "Fungerer, når renoveringen løfter vurderingen markant. 75 % af vurderingen er den typiske belåningsgrad ved omlægning.",
    ],
    method: "Metode: David Greene, Buy, Rehab, Rent, Refinance, Repeat (BiggerPockets Publishing, 2019).",
  },
  {
    name: "Værdistigningsmodel",
    tag: "Afkastet kommer fra langsigtet prisvækst, ikke månedlig leje",
    body: [
      "I dyre markeder med begrænset udbud — det centrale København, Oslo, Stockholm, London Zone 1, München — presses bruttoafkastet ned til 3–4 %, og en belånt bolig kører ofte let negativt på cash flow.",
      "Her ligger afkastet i den langsigtede værdistigning. Værdistigningstakter kommer fra Danmarks Statistik / SCB / SSB — vi ekstrapolerer aldrig ud over de offentliggjorte dataserier.",
    ],
    method: "Datakilder: DST (Danmark), SCB (Sverige), SSB (Norge).",
  },
  {
    name: "Value-add-model",
    tag: "Fremtvunget værdistigning via renovering eller repositionering",
    body: [
      "Adskiller sig fra BRRRR, fordi du ikke nødvendigvis lægger lånet om — du skaber værdi via en bestemt løftestang: renovér for at hæve lejen, lav en enfamiliesbolig om til to lejligheder, skift anvendelse eller løs et driftsproblem.",
      "Afkastet kommer fra dit arbejde, ikke fra markedsvind.",
    ],
    method: "Bagvedliggende teori: playbook for fremtvunget værdistigning fra erhvervsejendomme, tilpasset boliger (Ken McElroy, The ABCs of Real Estate Investing).",
  },
];

export default function InvestmentModelsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Fire måder at tjene penge på en bolig",
    description: metadata.description,
    author: { "@type": "Organization", name: "NordInvest" },
    publisher: { "@type": "Organization", name: "NordInvest" },
    mainEntityOfPage: "https://nordinvest.io/investment-models",
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <section className="px-6 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Strategier</p>
          <h1 className="mt-4 text-[2rem] font-bold leading-[1.12] tracking-tight [hyphens:auto] sm:text-5xl">
            Fire måder at tjene penge på en bolig
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
            Enhver ejendomsinvestering står og falder med, hvilken formuemotor du kører på. Den rigtige
            model afhænger af din kapital, din tidshorisont og selve boligen. Her er de fire modeller,
            NordInvest understøtter — og hvilken slags handel hver enkelt er bygget til.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-6">
          {MODELS.map((m, i) => (
            <div key={m.name} className="rounded-3xl border border-slate-200 bg-white p-7">
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-bold text-blue-600 tnum">0{i + 1}</span>
                <h2 className="text-xl font-bold text-slate-900">{m.name}</h2>
              </div>
              <div className="mt-1 text-sm font-medium text-slate-400">{m.tag}</div>
              <div className="mt-4 space-y-3 leading-relaxed text-slate-700">
                {m.body.map((p, j) => <p key={j}>{p}</p>)}
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{m.method}</p>
            </div>
          ))}

          <div className="rounded-3xl bg-slate-900 p-8 text-white md:p-10">
            <h2 className="text-2xl font-bold tracking-tight">I tvivl om, hvilken model der passer?</h2>
            <p className="mt-3 max-w-xl text-slate-300">
              Kør boligen gennem analysen — vi finder automatisk den formuemotor, der driver afkastet,
              og viser dig tallene for hver strategi.
            </p>
            <Link href="/analyseren" className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Åbn analyseren →
            </Link>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/glossary" className="text-blue-300 hover:text-blue-200">Ordbog →</Link>
              <Link href="/methodology" className="text-blue-300 hover:text-blue-200">Metode &amp; datakilder →</Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
