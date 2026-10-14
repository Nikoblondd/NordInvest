import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { geist } from "@/components/home/fonts";
import { Faq } from "@/components/landing/Faq";

export const metadata: Metadata = {
  title: "Pris: aftales efter en kort samtale",
  description: "NordInvest er et lukket system for danske ejendomsinvestorer. Prisen aftales efter en samtale på 20 minutter ud fra dit behov. Ingen binding.",
  alternates: { canonical: "/priser" },
};

const INCLUDED = [
  "Deal-motoren: hele markedet regnet igennem hver dag, med besked når en bolig passer til dig",
  "Analysen: overskud, afkast, renterisiko og 10 år frem med data fra BBR og Danmarks Statistik",
  "Gennemgang af salgsopstilling, referater og tilstandsrapport med sidetal",
  "Dine ejendomme: pipeline, opgaver, noter og bud samlet på hver bolig",
  "Budget til banken med kilder ved tallene",
  "Direkte kontakt til mig, når du har spørgsmål",
];

const FAQ = [
  { q: "Hvorfor står der ingen pris?", a: "Fordi behovet er forskelligt. En investor, der køber sin første udlejningsbolig, skal bruge noget andet end en, der har ti. Vi aftaler en pris, der passer til, hvor meget du bruger systemet." },
  { q: "Er der binding?", a: "Nej. Du kan stoppe, når du vil, og dine data er dine." },
  { q: "Forpligter samtalen mig til noget?", a: "Nej. Først når vi begge mener, at NordInvest passer til dig, aftaler vi pris og adgang." },
  { q: "Jeg har allerede et abonnement. Hvad nu?", a: "Det fortsætter som aftalt, og du kan altid se det eller opsige det under Konto, når du er logget ind." },
  { q: "Hvordan betaler jeg?", a: "Via Stripe med betalingskort eller MobilePay. Vi gemmer aldrig dine kortoplysninger selv." },
];

export default function PriserPage() {
  return (
    <div className={`${geist.variable} min-h-screen bg-white font-[family-name:var(--font-geist)] text-slate-900 antialiased`}>
      <Nav />
      <main>
        <section className="bg-gradient-to-b from-slate-50 to-white px-4 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-24">
          <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <h1 className="text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] text-[#0b1b33] [text-wrap:balance] sm:text-[56px]">
                Prisen aftaler vi, <span className="text-blue-600">når vi kender dit behov.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[18px] leading-relaxed text-slate-600">NordInvest er et lukket system for danske ejendomsinvestorer. Vi starter med en samtale på 20 minutter om, hvordan du investerer, og aftaler derefter en pris, der passer til dig.</p>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                <Link href="/adgang" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white hover:bg-blue-500">Anmod om adgang <ArrowRight size={17} /></Link>
                <Link href="/kontakt?emne=adgang" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-800 hover:border-slate-400"><Mail size={17} /> Kontakt os</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(11,27,51,0.3)] sm:p-8">
              <p className="text-[18px] font-semibold">Det får du med</p>
              <ul className="mt-4 space-y-3">
                {INCLUDED.map((t) => <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-slate-700"><Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />{t}</li>)}
              </ul>
              <p className="mt-6 border-t border-slate-100 pt-4 text-[14px] text-slate-500">Ingen binding. Dine data er dine.</p>
            </div>
          </div>
        </section>
        <section className="px-4 pb-24 sm:px-8">
          <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0b1b33] sm:text-[40px]">Spørgsmål om pris</h2>
            <Faq items={FAQ} />
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />
    </div>
  );
}
