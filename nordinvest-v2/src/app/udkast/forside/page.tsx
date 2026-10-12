import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowRight, Calculator, Check, FileSearch, Gamepad2, KanbanSquare, Phone, Search, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { Accordion } from "@/components/Accordion";
import { geist, serif } from "@/components/home/fonts";
import { WorkspacePreview } from "@/components/landing/WorkspacePreview";
import { QuickTest } from "@/components/landing/QuickTest";
import { AccessForm } from "@/components/landing/AccessForm";
import { getDealSnapshot } from "@/lib/deals-snapshot";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = { title: "Udkast: forside", robots: { index: false } };

const NAVY = "#0b1b33";
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;

const STEPS = [
  { Icon: Search, t: "Find", d: "Deal-motoren regner hver dag på boligerne til salg og viser dem, der passer til dig." },
  { Icon: Calculator, t: "Regn", d: "Overskud, afkast, renterisiko og 10 år frem. Tallene følger boligen videre." },
  { Icon: FileSearch, t: "Gennemgå", d: "Salgsopstilling, referater og tilstandsrapport læses for dig, med sidetal." },
  { Icon: KanbanSquare, t: "Beslut", d: "Fremvisning, bank og bud samlet på boligen. Ingen sedler, ingen regneark." },
];

const FAQ = [
  { q: "Hvad koster det?", a: "Prisen aftaler vi efter samtalen, ud fra hvor meget du køber, og hvad du skal bruge. Der er ingen binding, og du kan stoppe, når du vil." },
  { q: "Hvorfor skal man anmode om adgang?", a: "NordInvest er bygget til investorer, der køber for alvor. Ved at tale med dig først kan jeg sætte systemet op efter din strategi og dit område, og du får en, du kan ringe til." },
  { q: "Kan jeg prøve det, før jeg siger ja?", a: "Ja. Til samtalen gennemgår vi en bolig, du selv kigger på. Så ser du, hvad NordInvest finder, før du beslutter dig. Beregningen ovenfor kan du bruge med det samme." },
  { q: "Hvor kommer tallene fra?", a: "Fra BBR og matrikel via Datafordeler, Danmarks Statistik, Plandata og aktive boligannoncer. Hvert tal i analysen viser sin kilde." },
  { q: "Er det rådgivning?", a: "Nej. NordInvest giver dig beregninger og overblik. Den endelige vurdering er din, og ved køb anbefaler vi altid en købers rådgiver." },
  { q: "Jeg har allerede en konto. Hvad nu?", a: "Du logger ind som før. Dine gemte boliger og analyser er der stadig." },
];

export default async function DraftHome() {
  const snap = await getDealSnapshot(null, 4).catch(() => null);
  const top = snap?.top.slice(0, 4) ?? [];

  return (
    <div className={`${geist.variable} ${serif.variable} min-h-screen bg-white font-[family-name:var(--font-geist)] text-slate-900`}>
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <div className="hidden items-center gap-7 text-[14px] font-medium text-slate-600 md:flex">
            <a href="#system" className="hover:text-slate-900">Systemet</a>
            <a href="#test" className="hover:text-slate-900">Prøv selv</a>
            <a href="#for-hvem" className="hover:text-slate-900">For hvem</a>
            <Link href="/spil" className="hover:text-slate-900">Ejendomsspillet</Link>
            <Link href="/blog" className="hover:text-slate-900">Viden</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="inline-flex min-h-[40px] items-center px-2 text-[14px] font-medium text-slate-700 hover:text-slate-900">Log ind</Link>
            <a href="#adgang" className="inline-flex min-h-[40px] items-center rounded-lg bg-[#0b1b33] px-3 text-[14px] font-semibold text-white hover:bg-[#13284a] sm:px-3.5"><span className="sm:hidden">Få adgang</span><span className="hidden sm:inline">Anmod om adgang</span></a>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <h1 className="font-thesis text-[44px] leading-[1.02] tracking-[-0.01em] text-[#0b1b33] [text-wrap:balance] sm:text-[60px]">
              Køb den rigtige ejendom. Med tallene på plads, før du byder.
            </h1>
            <p className="mt-5 max-w-[34rem] text-[18px] leading-relaxed text-slate-600">
              NordInvest samler fund, analyse, papirer og bud i ét system for danske ejendomsinvestorer. Adgang sker efter en personlig samtale.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#adgang" className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white shadow-sm hover:bg-blue-500">Anmod om adgang <ArrowRight size={17} /></a>
              <a href="#test" className="inline-flex min-h-[48px] items-center rounded-lg border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-800 hover:border-slate-400">Prøv en beregning</a>
            </div>
          </div>
          <div className="lg:pl-6">
            <WorkspacePreview />
            <p className="mt-4 text-center text-[13px] text-slate-500 sm:mt-14">Dit arbejdsområde, vist med eksempler.</p>
          </div>
        </div>
      </section>

      {/* The process */}
      <section id="system" className="scroll-mt-16 bg-[#0b1b33] text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="max-w-2xl font-thesis text-[36px] leading-[1.08] [text-wrap:balance] sm:text-[46px]">Fra fundet bolig til købsaftale. I ét forløb.</h2>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/70">Hvad du finder, regner og læser, bliver på boligen. Du starter aldrig forfra i et nyt værktøj.</p>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ Icon, t, d }, i) => (
              <li key={t} className="bg-[#0b1b33] p-5 sm:p-6">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-blue-300"><Icon size={18} /></span>
                  <span className="text-[13px] font-medium tabular-nums text-white/40">{i + 1}</span>
                </span>
                <p className="mt-4 text-[19px] font-semibold">{t}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Free test */}
      <section id="test" className="scroll-mt-16 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <h2 className="font-thesis text-[36px] leading-[1.08] text-[#0b1b33] [text-wrap:balance] sm:text-[46px]">Prøv det på en bolig, du kigger på.</h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-slate-600">Tre tal er nok til at se, om boligen kan betale sig selv. Det er den samme beregning, som ligger under hele systemet.</p>
            <ul className="mt-6 space-y-2.5 text-[16px] text-slate-700">
              {["Overskud pr. måned efter lån og udgifter", "Afkast af købsprisen", "Hvor meget renten kan stige, før lejen ikke rækker"].map((t) => (
                <li key={t} className="flex gap-2.5"><Check size={19} className="mt-0.5 shrink-0 text-emerald-600" /> {t}</li>
              ))}
            </ul>
          </div>
          <QuickTest />
        </div>
      </section>

      {/* Deal-motor, with live data */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div className="order-2 min-w-0 lg:order-1">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(11,27,51,0.3)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-[14px] font-semibold">Bedste boliger i dag</p>
                <p className="hidden text-[12px] text-slate-500 sm:block">20 % udbetaling, 5 % rente</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {top.map((d, i) => (
                  <li key={d.href} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-4 text-[13px] font-semibold tabular-nums text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{d.address.split(",")[0]}</span>
                      <span className="block truncate text-[12px] text-slate-500">{d.zip} {d.city} · {kr(d.price)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block rounded bg-emerald-50 px-1.5 text-[12px] font-semibold tabular-nums text-emerald-700">+{Math.round(d.cashFlow).toLocaleString("da-DK")} kr./md.</span>
                      <span className="block text-[11px] tabular-nums text-slate-500">afkast {pct(d.capRate)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="order-1 min-w-0 lg:order-2">
            <p className="text-[14px] font-semibold text-blue-700">Deal-motoren</p>
            <h2 className="mt-2 font-thesis text-[36px] leading-[1.08] text-[#0b1b33] [text-wrap:balance] sm:text-[46px]">
              {snap ? `${snap.positive.toLocaleString("da-DK")} af ${snap.scanned.toLocaleString("da-DK")} boliger til salg kan betale sig selv.` : "Find de boliger, hvor tallene holder."}
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-slate-600">Deal-motoren regner på hele markedet hver dag og viser dig dem. Gem en bolig med ét tryk, så følger tallene med ind i din pipeline.</p>
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[14px] font-semibold text-blue-700">Papirerne</p>
            <h2 className="mt-2 font-thesis text-[36px] leading-[1.08] text-[#0b1b33] [text-wrap:balance] sm:text-[46px]">De 80 sider, ingen orker at læse. Læst, med sidetal.</h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-slate-600">Upload salgsopstilling, referater eller tilstandsrapport. Du får de vigtige tal, risici med citat og side, og spørgsmålene til mægleren.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-30px_rgba(11,27,51,0.3)]">
            <p className="text-[12px] font-medium text-slate-500">Eksempel · Referat, ordinær generalforsamling 2025 · 14 sider</p>
            <p className="mt-2 text-[16px] font-semibold">Foreningen har vedtaget nyt tag i 2026. Din andel skal betales ud over fællesudgiften.</p>
            <div className="mt-4 space-y-2.5">
              {[
                ["Høj", "Ekstraordinær indbetaling", "Ca. 38.000 kr. pr. lejlighed, forfalder 1. marts 2026.", "Side 11", "bg-rose-50 text-rose-700"],
                ["Middel", "Udlejning kræver bestyrelsens godkendelse", "Gælder udlejning ud over 2 år.", "Side 4", "bg-amber-50 text-amber-800"],
              ].map(([lvl, t, d, s, c]) => (
                <div key={t} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold"><span className={`rounded px-1.5 text-[11px] ${c}`}>{lvl}</span>{t}</p>
                    <p className="mt-0.5 text-[13px] text-slate-600">{d}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-medium text-slate-500">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline, full width */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-[14px] font-semibold text-blue-700">Dine ejendomme</p>
            <h2 className="mt-2 font-thesis text-[36px] leading-[1.08] text-[#0b1b33] [text-wrap:balance] sm:text-[46px]">Hver bolig har sin egen sag. Fra fremvisning til bud.</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Screening", "bg-slate-500", ["Søndergade 14", "Vesterbrogade 88"]],
              ["Fremvisning", "bg-sky-500", ["Algade 3"]],
              ["Papirer", "bg-amber-400", ["Nørregade 41"]],
              ["Bank", "bg-indigo-500", ["Kongensgade 7"]],
              ["Bud", "bg-orange-500", ["Torvet 2"]],
              ["Købt", "bg-emerald-500", []],
            ].map(([label, bar, items]) => (
              <div key={label as string} className="overflow-hidden rounded-xl bg-slate-100">
                <div className={`h-1 ${bar}`} />
                <p className="px-3 pt-2.5 text-[13px] font-semibold text-slate-700">{label as string}</p>
                <div className="space-y-1.5 p-2">
                  {(items as string[]).map((a) => <div key={a} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] font-semibold text-slate-900 shadow-sm">{a}</div>)}
                  {(items as string[]).length === 0 && <div className="h-9 rounded-lg border border-dashed border-slate-300" />}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[["Opgaver med dato", "Fremvisning tirsdag 16.00. Bankmøde torsdag. Du får besked dagen før."], ["Noter og kontakt", "Mæglerens navn og nummer, dine noter fra fremvisningen."], ["Dit bud", "Hvad du bød, hvornår, og hvad sælger svarede."]].map(([t, d]) => (
              <div key={t} className="border-t border-slate-200 pt-4"><p className="text-[16px] font-semibold">{t}</p><p className="mt-1 text-[15px] leading-relaxed text-slate-600">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* For whom */}
      <section id="for-hvem" className="scroll-mt-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="max-w-2xl font-thesis text-[36px] leading-[1.08] text-[#0b1b33] [text-wrap:balance] sm:text-[46px]">Bygget til private investorer i Danmark.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-[16px] font-semibold">NordInvest passer til dig, der</p>
              <ul className="mt-3 space-y-2.5 text-[15px] text-slate-700">
                {["ejer eller vil købe din første eller tiende udlejningsbolig", "selv finder boligerne og selv tager beslutningen", "vil have tallene og papirerne styr på, før banken spørger", "køber boliger, rækkehuse, villaer eller mindre erhverv"].map((t) => <li key={t} className="flex gap-2.5"><Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />{t}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-[16px] font-semibold">Det er nok ikke noget for dig, hvis du</p>
              <ul className="mt-3 space-y-2.5 text-[15px] text-slate-700">
                {["leder efter en rådgiver, der vælger boligen for dig", "køber store porteføljer med eget analyseteam", "kun vil se et enkelt tal én gang"].map((t) => <li key={t} className="flex gap-2.5"><X size={18} className="mt-0.5 shrink-0 text-slate-400" />{t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Founder + game */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 p-6 sm:flex-row sm:items-center">
            <Image src="/founder.jpg" alt="Nikolaj Blond, stifter af NordInvest" width={112} height={112} className="h-28 w-28 shrink-0 rounded-2xl object-cover" priority />
            <div>
              <p className="text-[20px] font-semibold">Du taler med mig, ikke et callcenter.</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">Jeg hedder {site.founder.name} og har bygget NordInvest. Jeg tager selv samtalen, sætter dig op og er den, du ringer til.</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px] font-medium">
                <a href={site.phoneHref} className="inline-flex items-center gap-1.5 text-slate-900 hover:text-blue-700"><Phone size={15} /> {site.phone}</a>
                <a href={`mailto:${site.email}`} className="text-slate-900 hover:text-blue-700">{site.email}</a>
              </div>
            </div>
          </div>
          <Link href="/spil" className="group flex flex-col justify-between rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200 hover:ring-slate-300">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-700 ring-1 ring-slate-200"><Gamepad2 size={20} /></span>
            <span className="mt-6">
              <span className="block text-[20px] font-semibold">Ny som investor? Øv dig først.</span>
              <span className="mt-1 block text-[15px] text-slate-600">Ejendomsspillet er gratis og åbent for alle.</span>
              <span className="mt-3 inline-flex items-center gap-1 text-[15px] font-semibold text-blue-700">Spil Ejendomsspillet <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
            </span>
          </Link>
        </div>
      </section>

      {/* Request access */}
      <section id="adgang" className="scroll-mt-16" style={{ background: `radial-gradient(1200px 500px at 20% 0%, #16325c 0%, ${NAVY} 60%)` }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 text-white sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-thesis text-[38px] leading-[1.06] [text-wrap:balance] sm:text-[50px]">Se NordInvest med din egen bolig.</h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-white/70">I stedet for en standarddemo tager vi udgangspunkt i en bolig, du selv overvejer.</p>
            <ol className="mt-8 space-y-5">
              {[["Send en anmodning", "Fortæl kort, hvad du ejer, og hvad du leder efter."], ["Vi tager en samtale på 20 minutter", "Jeg ringer dig op. Vi regner din bolig igennem sammen og finder ud af, om NordInvest passer til dig."], ["Du får en personlig invitation", "Vi aftaler pris, og du får et link til dit eget arbejdsområde med boligen allerede lagt ind."]].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-[14px] font-semibold">{i + 1}</span>
                  <span><span className="block text-[17px] font-semibold">{t}</span><span className="mt-0.5 block text-[15px] leading-relaxed text-white/65">{d}</span></span>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-[15px] text-white/65">Er du allerede medlem? <Link href="/auth/login" className="font-semibold text-white underline underline-offset-4">Log ind</Link></p>
          </div>
          <AccessForm />
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <h2 className="font-thesis text-[36px] leading-[1.08] text-[#0b1b33] sm:text-[46px]">Det spørger investorer om</h2>
          <Accordion items={FAQ} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
