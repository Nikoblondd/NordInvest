import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bell, CalendarClock, Calculator, Check, FileSearch, FileText, Gamepad2, KanbanSquare, LineChart, Phone, Search, ShieldCheck, Users } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { TryButton } from "@/components/landing/TryModal";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { geist } from "@/components/home/fonts";
import { BankScreen, CalendarScreen, Notice, OverviewScreen, PHOTO, PipelineScreen } from "@/components/landing/screens";
import { Walkthrough } from "@/components/landing/Walkthrough";
import { QuickTest } from "@/components/landing/QuickTest";
import { Faq } from "@/components/landing/Faq";
import { CountUp, Reveal } from "@/components/landing/motion";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "NordInvest · Systemet til danske ejendomsinvestorer" },
  description: "Find, regn, gennemgå og byd i ét system. NordInvest finder udlejningsboligerne, regner dem igennem, læser papirerne og holder styr på dine bud. Adgang efter en personlig samtale.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NordInvest · Systemet til danske ejendomsinvestorer",
    description: "Find, regn, gennemgå og byd i ét system. Adgang efter en personlig samtale.",
    url: "https://nordinvest.io",
  },
};

/* Shared type: one sans family, tight tracking, the second phrase in blue. */
function H2({ children, accent, dark, className }: { children: ReactNode; accent?: ReactNode; dark?: boolean; className?: string }) {
  return (
    <h2 className={`text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] [text-wrap:balance] sm:text-[48px] ${dark ? "text-white" : "text-[#0b1b33]"} ${className ?? ""}`}>
      {children}{accent && <> <span className={dark ? "text-blue-400" : "text-blue-600"}>{accent}</span></>}
    </h2>
  );
}
const Lead = ({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) => (
  <p className={`mt-5 max-w-[34rem] text-[18px] leading-relaxed ${dark ? "text-white/65" : "text-slate-600"} ${className ?? ""}`}>{children}</p>
);
const Cta = ({ dark, label = "Anmod om adgang" }: { dark?: boolean; label?: string }) => (
  <Link href="/adgang" className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-5 max-sm:w-full text-[16px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 active:translate-y-px ${dark ? "bg-white text-[#0b1b33] hover:bg-slate-100 focus-visible:ring-white/40" : "bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-200"}`}>{label} <ArrowRight size={17} /></Link>
);

const FLOW = [
  { Icon: Search, t: "Find", d: "Boligen dukker op" },
  { Icon: Calculator, t: "Regn", d: "Tallene på et minut" },
  { Icon: FileSearch, t: "Gennemgå", d: "Papirerne læst for dig" },
  { Icon: KanbanSquare, t: "Byd", d: "Med en klar grænse" },
];

const FAQ = [
  { q: "Hvad er NordInvest?", a: "NordInvest (nordinvest.io) er et dansk system til private ejendomsinvestorer, bygget af Nikolaj Blond (CVR 44701898). Det finder udlejningsboliger, regner dem igennem med data fra BBR og Danmarks Statistik, læser salgsopstilling og referater og samler fremvisninger, bank og bud på hver bolig. NordInvest har ingen forbindelse til Nordnet, NORD.investments, Nord-Invest ApS eller Nordinvest AB." },
  { q: "Hvad koster det?", a: "Prisen aftaler vi efter samtalen, ud fra hvor meget du køber, og hvad du skal bruge. Der er ingen binding, og du kan stoppe, når du vil." },
  { q: "Hvorfor skal man anmode om adgang?", a: "Fordi du får mest ud af NordInvest, når det er sat op efter din strategi og dit område. Det gør vi sammen i samtalen, og du får en, du kan ringe til." },
  { q: "Forpligter samtalen mig til noget?", a: "Nej. Samtalen handler om, hvordan du investerer i dag, og hvad du har brug for. Først når vi begge mener, at NordInvest passer til dig, aftaler vi pris. Beregningen på forsiden kan du bruge med det samme." },
  { q: "Hvem er NordInvest til?", a: "Private investorer i Danmark, der ejer eller vil købe udlejningsboliger, rækkehuse, villaer eller mindre erhverv, og som selv finder boligerne og selv beslutter." },
  { q: "Hvor kommer tallene fra?", a: "Fra BBR og matrikel via Datafordeler, Danmarks Statistik, Plandata og aktive boligannoncer. Kilden står ved hvert tal i analysen." },
  { q: "Er det rådgivning?", a: "Nej. NordInvest giver dig beregninger og overblik. Beslutningen er din, og ved køb anbefaler vi altid en købers rådgiver." },
  { q: "Jeg har allerede en konto. Hvad nu?", a: "Du logger ind som før. Dine gemte boliger og analyser er der stadig." },
];

export default async function Home() {
  const snap = await getDealSnapshot(null, 4).catch(() => null);

  return (
    <div className={`${geist.variable} min-h-screen bg-white font-[family-name:var(--font-geist)] text-slate-900 antialiased`}>
      <LandingNav />

      {/* Hero: fills the screen on desktop */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(900px 520px at 78% 30%, rgba(37,99,235,0.10), transparent 70%), linear-gradient(#f8fafc, #fff)" }} />
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-4 py-12 sm:px-8 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[0.82fr_1.18fr] lg:gap-14 lg:py-10">
          <div>
            <p className="hero-rise inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-600"><ShieldCheck size={14} className="text-blue-600" /> For danske ejendomsinvestorer</p>
            <h1 style={{ ["--d" as string]: "80ms" }} className="hero-rise mt-5 text-[42px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#0b1b33] [text-wrap:balance] sm:text-[56px] min-[1400px]:text-[68px]">
              Køb bedre ejendomme, <span className="text-blue-600">uden regneark og gætteri.</span>
            </h1>
            <p style={{ ["--d" as string]: "180ms" }} className="hero-rise mt-5 max-w-[33rem] text-[18px] leading-relaxed text-slate-600 sm:text-[19px]">
              NordInvest finder boligerne, regner dem igennem, læser papirerne og holder styr på dine bud. Ét system, med adgang efter en personlig samtale.
            </p>
            <div style={{ ["--d" as string]: "280ms" }} className="hero-rise mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Cta />
              <TryButton className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-800 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Prøv en beregning</TryButton>
            </div>
            <div style={{ ["--d" as string]: "380ms" }} className="hero-rise mt-8 hidden flex-wrap gap-2 sm:flex">
              {[[Search, "Deal-motor"], [LineChart, "Analyse"], [FileText, "Papirgennemgang"], [KanbanSquare, "Pipeline"]].map(([Icon, l]) => {
                const I = Icon as typeof Search;
                return <span key={l as string} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700"><I size={14} className="text-blue-600" />{l as string}</span>;
              })}
            </div>
          </div>
          <div className="relative lg:pl-4">
            <div className="hero-screen relative max-sm:max-h-[430px] max-sm:overflow-hidden"><OverviewScreen /><div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent sm:hidden" /></div>
            <Notice className="hero-pop absolute -top-6 right-2 hidden sm:block lg:-right-6" label="Lige nu" title="Ny bolig matcher dig" text="Algade 9, Holstebro. 1.150.000 kr. og +2.120 kr./md." action="Se boligen" />
            <Notice dark tone="green" className="hero-pop absolute -bottom-8 -left-6 hidden sm:block lg:-left-12 [--d:1200ms]" label="I går kl. 21.04" title="Referatet er læst" text="2 ting at spørge mægleren om, side 4 og 11." />
          </div>
        </div>
      </section>

      {/* Flow band */}
      <section className="bg-[#0b1b33] text-white" style={{ background: "radial-gradient(1000px 420px at 50% 0%, #17305a 0%, #0b1b33 70%)" }}>
        <div className="mx-auto max-w-[1320px] px-4 py-14 text-center sm:px-8 sm:py-24">
          <Reveal>
            <H2 dark accent="i ét system." className="mx-auto max-w-3xl">Fra fundet bolig til købsaftale,</H2>
            <p className="mx-auto mt-5 max-w-xl text-[18px] leading-relaxed text-white/65">Hvad du finder, regner og læser, bliver på boligen. Du starter aldrig forfra i et nyt værktøj.</p>
          </Reveal>
          <Reveal y={0} className="relative mx-auto mt-14 max-w-4xl">
          <ol className="relative grid grid-cols-2 gap-y-10 sm:grid-cols-4">
            <span aria-hidden className="draw-x absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-blue-500/20 via-blue-400/60 to-blue-500/20 sm:block" />
            {FLOW.map(({ Icon, t, d }, i) => (
              <li key={t} className="relative">
                <Reveal delay={150 + i * 140} className="flex flex-col items-center">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#13284a] text-blue-300 ring-1 ring-white/10"><Icon size={24} /><span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[12px] font-semibold text-white">{i + 1}</span></span>
                <p className="mt-4 text-[17px] font-semibold">{t}</p>
                <p className="mt-1 text-[14px] text-white/55">{d}</p>
                </Reveal>
              </li>
            ))}
          </ol>
          </Reveal>
        </div>
      </section>

      {/* Interactive walkthrough */}
      <section className="bg-slate-50" style={{ backgroundImage: "radial-gradient(rgba(11,27,51,0.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8 sm:py-28">
          <Reveal className="mx-auto max-w-3xl text-center">
            <H2 accent="hele vejen.">Følg én bolig,</H2>
            <p className="mx-auto mt-5 max-w-xl text-[18px] leading-relaxed text-slate-600">Tryk dig igennem, hvordan Algade 9 i Holstebro går fra fund til accepteret bud.</p>
          </Reveal>
          <div className="mt-12 lg:mt-6"><Walkthrough /></div>
        </div>
      </section>

      {/* Free test */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <p className="text-[14px] font-semibold text-blue-600">Gratis, uden login</p>
            <H2 className="mt-3" accent="du kigger på.">Prøv det på en bolig,</H2>
            <Lead>Tre tal er nok til at se, om boligen kan betale sig selv. Det er den samme beregning, som ligger under hele systemet.</Lead>
            <div className="mt-8 hidden max-w-md grid-cols-3 gap-3 sm:grid">
              {[[PHOTO(2), "Rækkehus"], [PHOTO(1), "Lejlighed"], [PHOTO(5), "Villa"]].map(([src, l], i) => (
                <div key={l} className={`parallax overflow-hidden rounded-xl ring-1 ring-slate-200 ${["[--a:18px]", "[--a:-26px]", "[--a:34px]"][i]}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${l}, eksempel`} className="aspect-square w-full object-cover" />
                  <p className="bg-white px-2 py-1.5 text-center text-[13px] font-medium text-slate-700">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={140} className="mx-auto w-full max-w-[640px]"><QuickTest autoplay /></Reveal>
        </div>
      </section>

      {/* The system, dark */}
      <section className="bg-[#0b1b33] text-white" style={{ background: "linear-gradient(#0b1b33, #0d2140)" }}>
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-3xl">
            <H2 dark accent="helt styr på dine handler.">Ét arbejdsområde, der giver dig</H2>
            <Lead dark>Når du har flere boliger i spil på én gang, er det overblikket, der afgør, hvem der byder først.</Lead>
          </Reveal>

          {[
            {
              n: 1, title: "Alle dine boliger på én tavle", text: "Hver bolig er en sag, der flytter sig fra screening til bud. Du ser med det samme, hvor meget du har i spil, og hvad der mangler.",
              points: [[KanbanSquare, "Tavle eller liste", "Træk en bolig videre, når du er klar"], [LineChart, "Tallene følger med", "Overskud og afkast står på hvert kort"], [Users, "Mægler og noter", "Navn, nummer og dine noter fra fremvisningen"]],
              screen: <PipelineScreen />, notice: { tone: "green" as const, label: "Flyttet til Bud", title: "Torvet 2, Viborg", text: "1,5 mio. kr. · +2.780 kr./md." },
            },
            {
              n: 2, title: "Aldrig en glemt fremvisning", text: "Opgaver med dato på hver bolig, samlet i én uge. Du får en mail dagen før, så intet glipper, mens du har travlt.",
              points: [[CalendarClock, "Hele ugen samlet", "Fremvisninger, bankmøder og frister"], [Bell, "Besked dagen før", "På mail, uden at du skal huske det"], [Check, "Afkryds og videre", "Klarede opgaver forsvinder fra listen"]],
              screen: <CalendarScreen />, notice: { tone: "blue" as const, label: "I morgen kl. 16.00", title: "Fremvisning, Algade 9", text: "Husk spørgsmålene om taget fra referatet." },
            },
            {
              n: 3, title: "Klar til banken med ét tryk", text: "Banken vil se, at lejen betaler lånet. Du sender et budget med kilder, i stedet for et hjemmelavet regneark.",
              points: [[FileText, "Budget som PDF", "Udbetaling, lån, leje og overskud"], [ShieldCheck, "Kilder ved tallene", "BBR, Danmarks Statistik og solgte boliger"], [LineChart, "Rentestress med", "Hvor højt renten kan gå"]],
              screen: <BankScreen />, notice: { tone: "green" as const, label: "Sendt til banken", title: "Budget for Algade 9", text: "Overskud +2.120 kr./md. ved 4,5 % rente." },
            },
          ].map((f, i) => (
            <div key={f.n} className={`mt-20 grid items-center gap-12 lg:mt-28 lg:gap-16 ${i % 2 ? "lg:grid-cols-[1.3fr_0.7fr]" : "lg:grid-cols-[0.7fr_1.3fr]"}`}>
              <Reveal className={i % 2 ? "lg:order-2" : ""}>
                <p className="flex items-center gap-3 text-[15px] font-semibold text-blue-300"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-[14px] text-white">{f.n}</span></p>
                <h3 className="mt-4 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[36px]">{f.title}</h3>
                <p className="mt-4 max-w-md text-[17px] leading-relaxed text-white/65">{f.text}</p>
                <ul className="mt-8 space-y-5">
                  {f.points.map(([Icon, t, d]) => {
                    const I = Icon as typeof Search;
                    return (
                      <li key={t as string} className="flex gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-blue-300 ring-1 ring-white/10"><I size={18} /></span>
                        <span><span className="block text-[16px] font-semibold">{t as string}</span><span className="block text-[15px] text-white/55">{d as string}</span></span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-9"><Cta dark /></div>
              </Reveal>
              <div className={`relative ${i % 2 ? "lg:order-1" : ""}`}>
                <div className="settle rounded-[22px] bg-white/[0.04] p-2 ring-1 ring-white/10 sm:p-3">{f.screen}</div>
                <Notice {...f.notice} className={`drift absolute -bottom-8 hidden sm:block ${i % 2 ? "-right-4 lg:-right-8" : "-left-4 lg:-left-8"}`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live numbers from the Deal-motor */}
      {snap && (
        <section className="bg-white">
          <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-8 sm:py-20">
            <div className="grid gap-px overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-3">
              {[
                [snap.scanned, "boliger til salg regnet igennem i dag"],
                [snap.positive, "af dem betaler sig selv med 20 % udbetaling og 5 % rente"],
                [snap.investmentsScanned, "investerings- og erhvervsejendomme regnet med"],
              ].map(([v, l], i) => (
                <Reveal key={l as string} delay={i * 120} y={16} className="bg-white p-6 sm:p-8">
                  <p className="text-[40px] font-semibold leading-none tracking-[-0.04em] text-[#0b1b33] sm:text-[52px]"><CountUp value={v as number} duration={1700 + i * 200} /></p>
                  <p className="mt-3 max-w-[16rem] text-[15px] leading-snug text-slate-600">{l as string}</p>
                </Reveal>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-slate-500">Tal fra Deal-motoren, opdateret hver 6. time.</p>
          </div>
        </section>
      )}

      {/* Getting started + founder */}
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-[1320px] gap-14 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <H2 accent="fra første dag.">Vi sætter det op sammen,</H2>
            <Lead>Du bliver ikke sendt rundt i en manual. Vi starter med en samtale om dine boliger, og du har mit nummer bagefter.</Lead>
            <div className="mt-10 flex items-center gap-5 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <Image src="/founder.jpg" alt="Nikolaj Blond, stifter af NordInvest" width={80} height={80} className="h-20 w-20 shrink-0 rounded-xl object-cover" priority />
              <div className="min-w-0">
                <p className="text-[17px] font-semibold">{site.founder.name}</p>
                <p className="text-[14px] text-slate-500">Stifter. Tager selv telefonen.</p>
                <div className="mt-1 flex flex-wrap gap-x-4 text-[14px] font-medium">
                  <a href={site.phoneHref} className="inline-flex min-h-[40px] items-center text-blue-700 hover:underline">{site.phone}</a>
                  <a href={`mailto:${site.email}`} className="inline-flex min-h-[40px] items-center text-blue-700 hover:underline">{site.email}</a>
                </div>
              </div>
            </div>
          </Reveal>
          <ol className="relative space-y-10 lg:pt-4">
            <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-px border-l-2 border-dashed border-slate-300" />
            {[
              ["En samtale om dit behov", "20 minutter i telefonen om, hvordan du investerer i dag, og hvor NordInvest kan gøre det lettere for dig."],
              ["Personlig opsætning", "Dit område, din strategi og dit krav til overskud bliver lagt ind, så Deal-vagten finder de rigtige boliger fra dag ét."],
              ["Du er i gang", "Du får en personlig invitation til dit eget arbejdsområde. Har du spørgsmål, ringer du direkte til mig."],
              ["Hvis du stopper", "Ingen binding. Du kan stoppe, når du vil, og dine data er dine."],
            ].map(([t, d], i) => (
              <li key={t} className="relative"><Reveal delay={i * 130} className="flex gap-5">
                <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${i === 3 ? "border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500" : "bg-[#0b1b33] text-white"}`}>{i + 1}</span>
                <span className="pt-1.5"><span className="block text-[19px] font-semibold tracking-[-0.01em]">{t}</span><span className="mt-1.5 block max-w-md text-[16px] leading-relaxed text-slate-600">{d}</span></span>
              </Reveal></li>
            ))}
          </ol>
        </div>
      </section>

      {/* Game */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-8">
          <Reveal><Link href="/spil" className="group grid items-center gap-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 to-white p-6 ring-1 ring-blue-100 transition-shadow hover:shadow-lg sm:grid-cols-[auto_1fr_auto] sm:p-8">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white"><Gamepad2 size={26} /></span>
            <span>
              <span className="block text-[22px] font-semibold tracking-[-0.02em] text-[#0b1b33]">Ny som investor? Øv dig i Ejendomsspillet.</span>
              <span className="mt-1 block text-[16px] text-slate-600">Køb, lej ud og byg en portefølje i en dansk by. Gratis og åbent for alle.</span>
            </span>
            <span className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-white px-4 text-[15px] font-semibold text-blue-700 ring-1 ring-blue-200">Spil nu <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
          </Link></Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-4 pb-24 pt-10 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <Reveal>
            <H2>Det spørger investorer om</H2>
            <p className="mt-5 text-[17px] text-slate-600">Er dit spørgsmål ikke her? Ring på <a href={site.phoneHref} className="font-semibold text-blue-700">{site.phone}</a>.</p>
          </Reveal>
          <Reveal delay={120}><Faq items={FAQ} /></Reveal>
        </div>
      </section>

      {/* Final call to action */}
      <section className="text-white" style={{ background: "radial-gradient(1100px 520px at 15% 0%, #1a3a6b 0%, #0b1b33 62%)" }}>
        <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <Reveal>
            <H2 dark accent="om det passer til dig.">Lad os finde ud af,</H2>
            <Lead dark>En samtale på 20 minutter om, hvordan du investerer, og hvad du har brug for. Passer NordInvest ikke til dig, siger jeg det.</Lead>
            <ol className="mt-10 space-y-6">
              {[["Send en anmodning", "Det tager 2 minutter. Jeg ringer dig op inden for en arbejdsdag."], ["Vi afdækker dit behov", "Hvad du ejer, hvad du vil købe, og hvor det i dag tager for lang tid eller føles usikkert."], ["Du får et ærligt svar", "Passer NordInvest til dig, aftaler vi pris og sætter det op sammen. Ellers siger jeg det."]].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[14px] font-semibold">{i + 1}</span>
                  <span><span className="block text-[17px] font-semibold">{t}</span><span className="mt-0.5 block text-[15px] leading-relaxed text-white/60">{d}</span></span>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Cta dark />
              <a href={site.phoneHref} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-white/25 max-sm:w-full px-5 text-[16px] font-semibold text-white hover:border-white/50"><Phone size={17} /> Ring {site.phone}</a>
            </div>
          </Reveal>
          <Reveal delay={150} y={32} className="relative mx-auto hidden w-full max-w-md sm:block">
            <div className="absolute -left-3 -top-3 h-full w-full rounded-2xl bg-blue-600" />
            <div className="relative rounded-2xl bg-white p-6 text-slate-900">
              <p className="flex items-center justify-between text-[16px] font-semibold">Det taler vi om <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">20 min.</span></p>
              {["Hvad du ejer i dag", "Hvad du vil købe, og hvor", "Hvor det går langsomt eller føles usikkert", "Om NordInvest kan hjælpe dig"].map((l) => (
                <div key={l} className="mt-4 border-b border-dashed border-slate-300 pb-2"><p className="text-[13px] text-slate-500">{l}</p></div>
              ))}
              <p className="mt-4 text-right text-[13px] text-slate-400">Ingen forberedelse nødvendig</p>
            </div>
          </Reveal>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />

      <Footer />
    </div>
  );
}
