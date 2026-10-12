import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bell, CalendarClock, Calculator, Check, FileSearch, FileText, Gamepad2, KanbanSquare, LineChart, Phone, Search, ShieldCheck, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { geist } from "@/components/home/fonts";
import { BankScreen, CalendarScreen, Notice, OverviewScreen, PHOTO, PipelineScreen } from "@/components/landing/screens";
import { Walkthrough } from "@/components/landing/Walkthrough";
import { QuickTest } from "@/components/landing/QuickTest";
import { AccessForm } from "@/components/landing/AccessForm";
import { Faq } from "@/components/landing/Faq";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Udkast: forside", robots: { index: false } };

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
  <a href="#adgang" className={`inline-flex min-h-[48px] items-center gap-2 rounded-lg px-5 text-[16px] font-semibold transition-colors active:translate-y-px ${dark ? "bg-white text-[#0b1b33] hover:bg-slate-100" : "bg-blue-600 text-white hover:bg-blue-500"}`}>{label} <ArrowRight size={17} /></a>
);

const FLOW = [
  { Icon: Search, t: "Find", d: "Boligen dukker op" },
  { Icon: Calculator, t: "Regn", d: "Tallene på et minut" },
  { Icon: FileSearch, t: "Gennemgå", d: "Papirerne læst for dig" },
  { Icon: KanbanSquare, t: "Byd", d: "Med en klar grænse" },
];

const FAQ = [
  { q: "Hvad koster det?", a: "Prisen aftaler vi efter samtalen, ud fra hvor meget du køber, og hvad du skal bruge. Der er ingen binding, og du kan stoppe, når du vil." },
  { q: "Hvorfor skal man anmode om adgang?", a: "Fordi du får mest ud af NordInvest, når det er sat op efter din strategi og dit område. Det gør vi sammen i samtalen, og du får en, du kan ringe til." },
  { q: "Kan jeg se det, før jeg siger ja?", a: "Ja. Til samtalen regner vi en bolig igennem, som du selv overvejer. Så ser du, hvad NordInvest finder, før du beslutter dig." },
  { q: "Hvem er NordInvest til?", a: "Private investorer i Danmark, der ejer eller vil købe udlejningsboliger, rækkehuse, villaer eller mindre erhverv, og som selv finder boligerne og selv beslutter." },
  { q: "Hvor kommer tallene fra?", a: "Fra BBR og matrikel via Datafordeler, Danmarks Statistik, Plandata og aktive boligannoncer. Kilden står ved hvert tal i analysen." },
  { q: "Er det rådgivning?", a: "Nej. NordInvest giver dig beregninger og overblik. Beslutningen er din, og ved køb anbefaler vi altid en købers rådgiver." },
  { q: "Jeg har allerede en konto. Hvad nu?", a: "Du logger ind som før. Dine gemte boliger og analyser er der stadig." },
];

export default async function DraftHome() {
  const snap = await getDealSnapshot(null, 4).catch(() => null);

  return (
    <div className={`${geist.variable} min-h-screen bg-white font-[family-name:var(--font-geist)] text-slate-900 antialiased`}>
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8">
          <Logo />
          <div className="hidden items-center gap-8 text-[15px] font-medium text-slate-600 lg:flex">
            <a href="#forlob" className="hover:text-slate-900">Sådan virker det</a>
            <a href="#test" className="hover:text-slate-900">Prøv selv</a>
            <a href="#system" className="hover:text-slate-900">Systemet</a>
            <Link href="/spil" className="hover:text-slate-900">Ejendomsspillet</Link>
            <Link href="/blog" className="hover:text-slate-900">Viden</Link>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <a href={site.phoneHref} className="hidden items-center gap-1.5 text-[15px] font-medium text-slate-700 hover:text-slate-900 xl:flex"><Phone size={15} /> {site.phone}</a>
            <Link href="/auth/login" className="inline-flex min-h-[40px] items-center px-2 text-[15px] font-medium text-slate-700 hover:text-slate-900">Log ind</Link>
            <a href="#adgang" className="inline-flex min-h-[40px] items-center rounded-lg bg-blue-600 px-3 text-[14px] font-semibold text-white hover:bg-blue-500 sm:px-4 sm:text-[15px]"><span className="sm:hidden">Få adgang</span><span className="hidden sm:inline">Anmod om adgang</span></a>
          </div>
        </nav>
      </header>

      {/* Hero: fills the screen on desktop */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(900px 520px at 78% 30%, rgba(37,99,235,0.10), transparent 70%), linear-gradient(#f8fafc, #fff)" }} />
        <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-4 py-12 sm:px-8 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[0.82fr_1.18fr] lg:gap-14 lg:py-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-600"><ShieldCheck size={14} className="text-blue-600" /> For danske ejendomsinvestorer</p>
            <h1 className="mt-5 text-[42px] font-semibold leading-[1.02] tracking-[-0.04em] text-[#0b1b33] [text-wrap:balance] sm:text-[56px] min-[1400px]:text-[68px]">
              Køb bedre ejendomme, <span className="text-blue-600">uden regneark og gætteri.</span>
            </h1>
            <p className="mt-5 max-w-[33rem] text-[18px] leading-relaxed text-slate-600 sm:text-[19px]">
              NordInvest finder boligerne, regner dem igennem, læser papirerne og holder styr på dine bud. Ét system, med adgang efter en personlig samtale.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Cta />
              <a href="#test" className="inline-flex min-h-[48px] items-center rounded-lg border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-800 hover:border-slate-400">Prøv en beregning</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {[[Search, "Deal-motor"], [LineChart, "Analyse"], [FileText, "Papirgennemgang"], [KanbanSquare, "Pipeline"]].map(([Icon, l]) => {
                const I = Icon as typeof Search;
                return <span key={l as string} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700"><I size={14} className="text-blue-600" />{l as string}</span>;
              })}
            </div>
          </div>
          <div className="relative lg:pl-4">
            <OverviewScreen />
            <Notice className="absolute -top-6 right-2 hidden sm:block lg:-right-6" label="Lige nu" title="Ny bolig matcher dig" text="Algade 9, Holstebro. 1.150.000 kr. og +2.120 kr./md." action="Se boligen" />
            <Notice dark tone="green" className="absolute -bottom-8 -left-6 hidden sm:block lg:-left-12" label="I går kl. 21.04" title="Referatet er læst" text="2 ting at spørge mægleren om, side 4 og 11." />
          </div>
        </div>
      </section>

      {/* Flow band */}
      <section className="bg-[#0b1b33] text-white" style={{ background: "radial-gradient(1000px 420px at 50% 0%, #17305a 0%, #0b1b33 70%)" }}>
        <div className="mx-auto max-w-[1320px] px-4 py-16 text-center sm:px-8 sm:py-24">
          <H2 dark accent="i ét system." className="mx-auto max-w-3xl">Fra fundet bolig til købsaftale,</H2>
          <p className="mx-auto mt-5 max-w-xl text-[18px] leading-relaxed text-white/65">Hvad du finder, regner og læser, bliver på boligen. Du starter aldrig forfra i et nyt værktøj.</p>
          <ol className="relative mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-y-10 sm:grid-cols-4">
            <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-7 hidden h-px bg-gradient-to-r from-blue-500/20 via-blue-400/60 to-blue-500/20 sm:block" />
            {FLOW.map(({ Icon, t, d }, i) => (
              <li key={t} className="relative flex flex-col items-center">
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#13284a] text-blue-300 ring-1 ring-white/10"><Icon size={24} /><span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-semibold text-white">{i + 1}</span></span>
                <p className="mt-4 text-[17px] font-semibold">{t}</p>
                <p className="mt-1 text-[14px] text-white/55">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Interactive walkthrough */}
      <section id="forlob" className="scroll-mt-16 bg-slate-50" style={{ backgroundImage: "radial-gradient(rgba(11,27,51,0.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <H2 accent="hele vejen.">Følg én bolig,</H2>
            <p className="mx-auto mt-5 max-w-xl text-[18px] leading-relaxed text-slate-600">Tryk dig igennem, hvordan Algade 9 i Holstebro går fra fund til accepteret bud.</p>
          </div>
          <div className="mt-12"><Walkthrough /></div>
        </div>
      </section>

      {/* Free test */}
      <section id="test" className="scroll-mt-16 bg-white">
        <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="text-[14px] font-semibold text-blue-600">Gratis, uden login</p>
            <H2 className="mt-3" accent="du kigger på.">Prøv det på en bolig,</H2>
            <Lead>Tre tal er nok til at se, om boligen kan betale sig selv. Det er den samme beregning, som ligger under hele systemet.</Lead>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {[[PHOTO(2), "Rækkehus"], [PHOTO(1), "Lejlighed"], [PHOTO(5), "Villa"]].map(([src, l]) => (
                <div key={l} className="overflow-hidden rounded-xl ring-1 ring-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`${l}, eksempel`} className="aspect-square w-full object-cover" />
                  <p className="bg-white px-2 py-1.5 text-center text-[13px] font-medium text-slate-700">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[640px]"><QuickTest /></div>
        </div>
      </section>

      {/* The system, dark */}
      <section id="system" className="scroll-mt-16 bg-[#0b1b33] text-white" style={{ background: "linear-gradient(#0b1b33, #0d2140)" }}>
        <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8 sm:py-28">
          <div className="max-w-3xl">
            <H2 dark accent="helt styr på dine handler.">Ét arbejdsområde, der giver dig</H2>
            <Lead dark>Når du har flere boliger i spil på én gang, er det overblikket, der afgør, hvem der byder først.</Lead>
          </div>

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
              <div className={i % 2 ? "lg:order-2" : ""}>
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
              </div>
              <div className={`relative ${i % 2 ? "lg:order-1" : ""}`}>
                <div className="rounded-[22px] bg-white/[0.04] p-2 ring-1 ring-white/10 sm:p-3">{f.screen}</div>
                <Notice {...f.notice} className={`absolute -bottom-8 hidden sm:block ${i % 2 ? "-right-4 lg:-right-8" : "-left-4 lg:-left-8"}`} />
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
                [snap.scanned.toLocaleString("da-DK"), "boliger til salg regnet igennem i dag"],
                [snap.positive.toLocaleString("da-DK"), "af dem betaler sig selv med 20 % udbetaling og 5 % rente"],
                [snap.investmentsScanned.toLocaleString("da-DK"), "investerings- og erhvervsejendomme regnet med"],
              ].map(([v, l]) => (
                <div key={l} className="bg-white p-6 sm:p-8">
                  <p className="text-[40px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-[#0b1b33] sm:text-[52px]">{v}</p>
                  <p className="mt-3 max-w-[16rem] text-[15px] leading-snug text-slate-600">{l}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-slate-500">Tal fra Deal-motoren, opdateret hver 6. time.</p>
          </div>
        </section>
      )}

      {/* Getting started + founder */}
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-[1320px] gap-14 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-20">
          <div>
            <H2 accent="fra første dag.">Vi sætter det op sammen,</H2>
            <Lead>Du bliver ikke sendt rundt i en manual. Vi starter med en samtale om dine boliger, og du har mit nummer bagefter.</Lead>
            <div className="mt-10 flex items-center gap-5 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <Image src="/founder.jpg" alt="Nikolaj Blond, stifter af NordInvest" width={80} height={80} className="h-20 w-20 shrink-0 rounded-xl object-cover" priority />
              <div className="min-w-0">
                <p className="text-[17px] font-semibold">{site.founder.name}</p>
                <p className="text-[14px] text-slate-500">Stifter. Tager selv telefonen.</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] font-medium">
                  <a href={site.phoneHref} className="text-blue-700 hover:underline">{site.phone}</a>
                  <a href={`mailto:${site.email}`} className="text-blue-700 hover:underline">{site.email}</a>
                </div>
              </div>
            </div>
          </div>
          <ol className="relative space-y-10 lg:pt-4">
            <span aria-hidden className="absolute bottom-6 left-[19px] top-6 w-px border-l-2 border-dashed border-slate-300" />
            {[
              ["Samtale med din egen bolig", "20 minutter i telefonen. Vi regner en bolig igennem, som du overvejer, og ser, om NordInvest passer til dig."],
              ["Personlig opsætning", "Dit område, din strategi og dit krav til overskud bliver lagt ind, så Deal-vagten finder de rigtige boliger fra dag ét."],
              ["Du er i gang", "Du får en personlig invitation med boligen fra samtalen allerede lagt ind. Har du spørgsmål, ringer du direkte til mig."],
              ["Hvis du stopper", "Ingen binding. Du kan stoppe, når du vil, og dine data er dine."],
            ].map(([t, d], i) => (
              <li key={t} className="relative flex gap-5">
                <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${i === 3 ? "border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500" : "bg-[#0b1b33] text-white"}`}>{i + 1}</span>
                <span className="pt-1.5"><span className="block text-[19px] font-semibold tracking-[-0.01em]">{t}</span><span className="mt-1.5 block max-w-md text-[16px] leading-relaxed text-slate-600">{d}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Game */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-8">
          <Link href="/spil" className="group grid items-center gap-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 to-white p-6 ring-1 ring-blue-100 transition-shadow hover:shadow-lg sm:grid-cols-[auto_1fr_auto] sm:p-8">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white"><Gamepad2 size={26} /></span>
            <span>
              <span className="block text-[22px] font-semibold tracking-[-0.02em] text-[#0b1b33]">Ny som investor? Øv dig i Ejendomsspillet.</span>
              <span className="mt-1 block text-[16px] text-slate-600">Køb, lej ud og byg en portefølje i en dansk by. Gratis og åbent for alle.</span>
            </span>
            <span className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-white px-4 text-[15px] font-semibold text-blue-700 ring-1 ring-blue-200">Spil nu <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-4 pb-24 pt-10 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <H2>Det spørger investorer om</H2>
            <p className="mt-5 text-[17px] text-slate-600">Er dit spørgsmål ikke her? Ring på <a href={site.phoneHref} className="font-semibold text-blue-700">{site.phone}</a>.</p>
          </div>
          <Faq items={FAQ} />
        </div>
      </section>

      {/* Request access */}
      <section id="adgang" className="scroll-mt-16 text-white" style={{ background: "radial-gradient(1100px 520px at 15% 0%, #1a3a6b 0%, #0b1b33 62%)" }}>
        <div className="mx-auto grid max-w-[1320px] gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <H2 dark accent="med din egen bolig.">Se NordInvest</H2>
            <Lead dark>I stedet for en standarddemo tager vi udgangspunkt i en bolig, du selv overvejer.</Lead>
            <ol className="mt-10 space-y-6">
              {[["Send en anmodning", "Det tager 2 minutter. Jeg ringer dig op inden for en arbejdsdag."], ["Tag en bolig med", "Et link fra Boligsiden, Home eller EDC er nok."], ["Vi regner den igennem sammen", "Du ser hele forløbet på din egen bolig og beslutter, om NordInvest er noget for dig."]].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[14px] font-semibold">{i + 1}</span>
                  <span><span className="block text-[17px] font-semibold">{t}</span><span className="mt-0.5 block text-[15px] leading-relaxed text-white/60">{d}</span></span>
                </li>
              ))}
            </ol>
            {/* "Your property in NordInvest" card */}
            <div className="relative mt-12 hidden max-w-md sm:block">
              <div className="absolute -left-3 -top-3 h-full w-full rounded-2xl bg-blue-600" />
              <div className="relative rounded-2xl bg-white p-5 text-slate-900">
                <p className="flex items-center justify-between text-[15px] font-semibold">Din bolig i NordInvest <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">Ny</span></p>
                {["Adresse", "Udbudspris", "Husleje"].map((l) => (
                  <div key={l} className="mt-3 border-b border-dashed border-slate-300 pb-1.5"><p className="text-[11px] text-slate-400">{l}</p></div>
                ))}
                <p className="mt-3 text-right text-[12px] text-slate-400">Det udfylder vi sammen i samtalen</p>
              </div>
            </div>
            <p className="mt-10 text-[15px] text-white/60">Er du allerede medlem? <Link href="/auth/login" className="font-semibold text-white underline underline-offset-4">Log ind</Link></p>
          </div>
          <div><AccessForm /></div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
