import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Phone } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { TryButton } from "@/components/landing/TryModal";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { BankScreen, CalendarScreen, PipelineScreen } from "@/components/landing/screens";
import { Walkthrough } from "@/components/landing/Walkthrough";
import { QuickTest } from "@/components/landing/QuickTest";
import { Faq } from "@/components/landing/Faq";
import { getDealSnapshot, type SnapshotDeal } from "@/lib/deals-snapshot";
import { site } from "@/lib/site";
import { HaveAccount } from "@/components/auth/HaveAccount";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "NordInvest · Ejendomsanalyse til danske investorer" },
  description: "Regn udlejningsejendomme igennem med sælgers driftsbudget, BBR, den offentlige vurdering og dagens realkreditrente. Kilde på hvert tal. Adgang efter en personlig samtale.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "NordInvest · Ejendomsanalyse til danske investorer",
    description: "Sælgers tal, BBR, vurdering og dagens rente i ét regnestykke. Kilde på hvert tal.",
    url: "https://nordinvest.io",
  },
};

/*
 * The landing page, redesigned Oct 2026 after an investor said the site felt
 * AI-generated. Principles: paper canvas and ink navy, one heading colour,
 * medium-weight headings, no glows, gradients, floating notifications or
 * fade-ins; real numbers from today's Deal-motor; every claim specific; the
 * person behind it visible.
 */

const ink = "text-[#17213a]";
const H2 = ({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) => (
  <h2 className={`font-[family-name:var(--font-display)] text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] [text-wrap:balance] sm:text-[40px] ${dark ? "text-white" : ink} ${className ?? ""}`}>{children}</h2>
);
const Eyebrow = ({ children, dark }: { children: ReactNode; dark?: boolean }) => (
  <p className={`flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.12em] ${dark ? "text-white/60" : "text-[#555661]"}`}>
    <span aria-hidden className={`h-px w-8 ${dark ? "bg-white/40" : "bg-[#17213a]/40"}`} />{children}
  </p>
);
const Cta = ({ dark, label = "Anmod om adgang" }: { dark?: boolean; label?: string }) => (
  <Link href="/adgang" className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-5 text-[16px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 active:translate-y-px max-sm:w-full ${dark ? "bg-white text-[#17213a] hover:bg-[#efece5] focus-visible:ring-white/40" : "bg-[#17213a] text-white hover:bg-[#25345a] focus-visible:ring-[#c6cedd]"}`}>{label} <ArrowRight size={17} strokeWidth={1.8} /></Link>
);
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n)).toLocaleString("da-DK")} kr.`;
const pct = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %`;

const FAQ = [
  { q: "Hvad er NordInvest?", a: "NordInvest (nordinvest.io) er et dansk analyseværktøj og system til private ejendomsinvestorer og mæglere, bygget af Nikolaj Blond (CVR 44701898). Det regner boliger og udlejningsejendomme igennem med sælgers tal, BBR, Ejendomsvurderingen, Danmarks Statistik og Nationalbankens renter, og det samler fremvisninger, bank og bud på hver bolig. NordInvest har ingen forbindelse til Nordnet, NORD.investments, Nord-Invest ApS eller Nordinvest AB." },
  { q: "Hvor præcise er tallene?", a: "Analysen viser sælgers tal og NordInvests egne skøn hver for sig, og der står en kilde ved hvert tal. Den holder sælgers leje op mod markedslejen for hver bolig i BBR og driftsudgifterne op mod kommunens grundskyld. Fremtiden vises som tre scenarier, ikke som én prognose. Lejeliste, regnskab og en teknisk gennemgang erstatter den ikke, og det står i analysen." },
  { q: "Hvad koster det?", a: "Prisen aftaler vi efter samtalen, ud fra hvor meget du køber, og hvad du skal bruge. Der er ingen binding, og du kan stoppe, når du vil." },
  { q: "Hvorfor skal man anmode om adgang?", a: "Fordi du får mest ud af NordInvest, når det er sat op efter din strategi og dit område. Det gør vi sammen i samtalen, og du får en, du kan ringe til." },
  { q: "Hvem er NordInvest til?", a: "Private investorer, der ejer eller vil købe udlejningsboliger og mindre udlejnings- og erhvervsejendomme, og erhvervsmæglere, der vil vise købere regnestykket bag deres sager." },
  { q: "Er det rådgivning?", a: "Nej. NordInvest giver dig beregninger og overblik. Beslutningen er din, og ved køb anbefaler vi altid en købers rådgiver." },
  { q: "Jeg har allerede en konto. Hvad nu?", a: "Du logger ind som før. Dine gemte boliger og analyser er der stadig." },
];

const SOURCES: [string, string, string][] = [
  ["Boligsiden og Ejendomstorvet", "Pris, areal, ejerudgift, sælgers afkast og driftsudgifter", "Udgangspunktet for regnestykket"],
  ["BBR via Datafordeler", "Hver bolig og erhvervsenhed med areal, byggeår, tag, facade og varme", "Markedsleje pr. bolig, vedligehold efter alder, asbest, oliefyr og gas"],
  ["Ejendomsvurderingen", "Ejendomsværdi og grundværdi", "Pris holdt op mod vurderingen og skøn over grundskyld"],
  ["Danmarks Statistik", "Grundskyldspromille for alle 98 kommuner, prisindeks og huslejeindeks", "Ejendomsskat og prisudvikling i området"],
  ["Danmarks Nationalbank", "Effektiv rente inkl. bidrag på nye realkreditlån, hver måned", "Standardrenten i analysen"],
  ["Plandata.dk", "Lokalplaner, forslag og kloakoplande", "Fremtidige byrder på grunden"],
];

/** Today's top-ranked home from the Deal-motor, shown as the ledger the analysis builds on. */
function Ledger({ d, updated }: { d: SnapshotDeal; updated: string }) {
  const rent = (d.grossYield * d.price) / 1200;
  const noi = (d.capRate * d.price) / 1200;
  const costs = rent - noi;
  const loan = noi - d.cashFlow;
  const at = new Date(updated).toLocaleString("da-DK", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" });
  const Row = ({ k, v, src, strong }: { k: string; v: string; src?: string; strong?: boolean }) => (
    <div className={`flex items-baseline justify-between gap-3 py-2 ${strong ? "border-t-2 border-[#17213a] pt-3" : ""}`}>
      <dt className={`min-w-0 ${strong ? "font-semibold text-[#17213a]" : "text-[#3c4153]"}`}>{k}{src && <span className="ml-2 rounded bg-[#f1efea] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#555661]">{src}</span>}</dt>
      <dd className={`shrink-0 tabular-nums ${strong ? `text-[20px] font-bold ${d.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"}` : "text-[#17213a]"}`}>{v}</dd>
    </div>
  );
  return (
    <Link href={d.href} className="group block rounded-2xl border border-[#e4e0d8] bg-white p-5 shadow-[0_1px_2px_rgba(23,33,58,0.05),0_18px_40px_-28px_rgba(23,33,58,0.35)] transition-shadow hover:shadow-[0_1px_2px_rgba(23,33,58,0.06),0_22px_48px_-26px_rgba(23,33,58,0.4)] sm:p-6">
      <p className="text-[13px] text-[#555661]">Øverst i Deal-motoren, {at}</p>
      <div className="mt-3 flex items-center gap-4">
        {d.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.image} alt={`${d.address}, boligen øverst i Deal-motoren`} className="h-16 w-20 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[18px] font-semibold text-[#17213a]">{d.address.split(",")[0]}</p>
          <p className="text-[14px] text-[#555661]">{d.zip} {d.city}{d.area ? ` · ${d.area} m²` : ""}{d.rooms ? ` · ${d.rooms} vær.` : ""}</p>
        </div>
      </div>
      <dl className="mt-4 text-[15px]">
        <Row k="Udbudspris" v={kr(d.price)} src="Annonce" />
        <Row k="Markedsleje pr. md." v={kr(rent)} src="Skøn" />
        <Row k="Drift og vedligehold" v={signed(-costs)} src="Annonce + skøn" />
        <Row k="Ydelse, 80 % lån" v={signed(-loan)} src="5 % rente" />
        <Row k="Cash flow pr. md." v={signed(d.cashFlow)} strong />
      </dl>
      <p className="mt-3 flex items-center justify-between gap-3 text-[14px]">
        <span className="text-[#555661]">Nettoafkast {pct(d.capRate)}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-[#17213a] group-hover:underline">Se hele analysen <ArrowRight size={15} strokeWidth={1.8} /></span>
      </p>
    </Link>
  );
}

export default async function Home() {
  const snap = await getDealSnapshot(null, 4).catch(() => null);
  const top = snap?.top?.[0] ?? null;

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17213a] antialiased">
      <LandingNav />

      {/* Hero */}
      <section className="border-b border-[#e4e0d8]">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:gap-14">
          <div className="min-w-0">
            <Eyebrow>Ejendomsanalyse til private investorer og mæglere</Eyebrow>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] text-[#17213a] [hyphens:auto] [text-wrap:balance] sm:text-[46px]">
              Regn udlejningsejendomme igennem med tal, du kan stå inde for.
            </h1>
            <p className="mt-6 max-w-[36rem] text-[18px] leading-relaxed text-[#3c4153]">
              NordInvest henter sælgers driftsbudget, BBR, den offentlige vurdering og dagens realkreditrente. Du ser, hvad ejendommen giver efter lånet, hvad driften kan tåle, og hvad du mangler at få styr på, før du byder.
            </p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Cta />
              <TryButton className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#cfc9be] bg-white px-5 text-[16px] font-semibold text-[#17213a] hover:border-[#a09a90] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e2e6ee]">Prøv en beregning</TryButton>
            </div>
            <Suspense><HaveAccount className="mt-4" /></Suspense>
            <p className="mt-8 text-[14px] leading-relaxed text-[#555661]">
              {snap ? <><b className="font-semibold tabular-nums text-[#17213a]">{snap.scanned.toLocaleString("da-DK")}</b> boliger regnet igennem i dag · </> : null}
              Data fra BBR, Danmarks Statistik og Nationalbanken · Udviklet i Danmark af {site.founder.name}
            </p>
          </div>
          <div className="w-full max-w-[460px] justify-self-center lg:justify-self-end">
            {top && snap ? <Ledger d={top} updated={snap.updated} /> : null}
          </div>
        </div>
      </section>

      {/* Figures */}
      {snap && (
        <section className="bg-white">
          <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-8 sm:py-14">
            <dl className="grid grid-cols-2 gap-y-8 lg:grid-cols-4">
              {[
                [snap.scanned.toLocaleString("da-DK"), "boliger til salg regnet igennem i dag"],
                [snap.positive.toLocaleString("da-DK"), "af dem betaler sig selv med 20 % udbetaling og 5 % rente"],
                [snap.investmentsScanned.toLocaleString("da-DK"), "udlejnings- og erhvervsejendomme regnet med"],
                ["98", "kommuner med grundskyld og markedsdata"],
              ].map(([v, l]) => (
                <div key={l} className="border-l-2 border-[#17213a] pl-4 pr-4">
                  <dt className="sr-only">{l}</dt>
                  <dd>
                    <span className="block font-[family-name:var(--font-display)] text-[30px] font-semibold leading-none tracking-[-0.02em] sm:text-[36px]">{v}</span>
                    <span className="mt-2 block max-w-[15rem] text-[14px] leading-snug text-[#555661]">{l}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-[13px] text-[#6f6c68]">Tal fra Deal-motoren, opdateret hver 6. time.</p>
          </div>
        </section>
      )}

      {/* Sources */}
      <section className="border-y border-[#e4e0d8]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <Eyebrow>Datagrundlag</Eyebrow>
            <H2 className="mt-5">Hvor tallene kommer fra</H2>
            <p className="mt-5 max-w-[30rem] text-[17px] leading-relaxed text-[#3c4153]">
              Hver analyse skiller sælgers tal, offentlige registre og NordInvests egne skøn ad. Står et tal på et skøn, står det der. Metoden og alle ændringer i den er offentlige.
            </p>
            <Link href="/methodology#investeringsejendomme" className="mt-6 inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#17213a] underline decoration-[#a09a90] underline-offset-4 hover:decoration-[#17213a]">Metode og versionslog <ArrowRight size={16} strokeWidth={1.8} /></Link>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#e4e0d8] bg-white">
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <thead className="border-b border-[#e4e0d8] text-[13px] text-[#555661]">
                <tr><th className="px-5 py-3 font-medium">Kilde</th><th className="px-3 py-3 font-medium">Hvad vi henter</th><th className="px-5 py-3 font-medium">Bruges til</th></tr>
              </thead>
              <tbody className="divide-y divide-[#efece5]">
                {SOURCES.map(([s, w, u]) => (
                  <tr key={s} className="align-top">
                    <td className="px-5 py-3.5 font-semibold text-[#17213a]">{s}</td>
                    <td className="px-3 py-3.5 text-[#3c4153]">{w}</td>
                    <td className="px-5 py-3.5 text-[#3c4153]">{u}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Walkthrough */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <Eyebrow>Ét forløb</Eyebrow>
            <H2 className="mt-5">Følg Algade 9 i Holstebro fra annonce til accepteret bud</H2>
            <p className="mt-5 text-[17px] leading-relaxed text-[#3c4153]">Søgeagent, analyse, salgsopstilling, bank og bud ligger på samme bolig. Tryk dig igennem forløbet.</p>
          </div>
          <div className="mt-10"><Walkthrough /></div>
        </div>
      </section>

      {/* Quick test */}
      <section>
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <Eyebrow>Uden login</Eyebrow>
            <H2 className="mt-5">Prøv beregningen på en bolig, du kigger på</H2>
            <p className="mt-5 max-w-[30rem] text-[17px] leading-relaxed text-[#3c4153]">Pris, leje og udbetaling er nok til at se, om boligen kan betale sig selv. Det er samme beregning, som ligger under hele systemet.</p>
          </div>
          <div className="mx-auto w-full max-w-[640px]"><QuickTest autoplay /></div>
        </div>
      </section>

      {/* The system */}
      <section className="bg-[#17213a] text-white">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <Eyebrow dark>Systemet</Eyebrow>
            <H2 dark className="mt-5">Når flere boliger er i spil på én gang</H2>
            <p className="mt-5 text-[17px] leading-relaxed text-white/70">Pipeline, kalender og bankbudget hænger sammen med analysen, så du ikke taster det samme ind to steder.</p>
          </div>
          {[
            { title: "Alle boliger på én tavle", text: "Hver bolig er en sag, der flytter sig fra screening til bud. Cash flow og afkast står på kortet, mæglerens nummer og dine noter fra fremvisningen ligger på sagen.", more: { href: "/funktioner/pipeline", label: "Om pipelinen" }, screen: <PipelineScreen /> },
            { title: "Fremvisninger og frister i én kalender", text: "Aftaler med dato på hver bolig, samlet i én uge. Du får en mail dagen før.", more: { href: "/funktioner/pipeline", label: "Om kalenderen" }, screen: <CalendarScreen /> },
            { title: "Et budget, banken kan læse", text: "Udbetaling, lån, leje, drift og rentestress som PDF og Excel, med kilden ved hvert tal.", more: { href: "/funktioner/boliganalyse", label: "Om analysen og bankrapporten" }, screen: <BankScreen /> },
          ].map((f, i) => (
            <div key={f.title} className={`mt-16 grid items-center gap-10 border-t border-white/10 pt-16 lg:gap-16 ${i % 2 ? "lg:grid-cols-[1.25fr_0.75fr]" : "lg:grid-cols-[0.75fr_1.25fr]"}`}>
              <div className={i % 2 ? "lg:order-2" : ""}>
                <h3 className="font-[family-name:var(--font-display)] text-[26px] font-semibold leading-[1.15] tracking-[-0.015em] sm:text-[30px]">{f.title}</h3>
                <p className="mt-4 max-w-md text-[17px] leading-relaxed text-white/70">{f.text}</p>
                <Link href={f.more.href} className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 text-[16px] font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">{f.more.label} <ArrowRight size={16} strokeWidth={1.8} /></Link>
              </div>
              <div className={`rounded-2xl bg-white/[0.04] p-2 ring-1 ring-white/10 sm:p-3 ${i % 2 ? "lg:order-1" : ""}`}>{f.screen}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The person behind it */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <Image src="/founder.jpg" alt={`${site.founder.name}, stifter af NordInvest`} width={420} height={520} className="aspect-[4/5] w-full max-w-[360px] rounded-2xl object-cover" />
          </div>
          <div className="lg:pt-6">
            <Eyebrow>Hvem står bag</Eyebrow>
            <H2 className="mt-5">Jeg står selv for tallene</H2>
            <div className="mt-6 max-w-[36rem] space-y-4 text-[17px] leading-relaxed text-[#3c4153]">
              <p>Jeg hedder {site.founder.name.split(" ")[0]} og har bygget NordInvest, beregningsmodellen og dataintegrationerne. Når en mægler eller investor finder en fejl, retter jeg den, og ændringen står i metodebeskrivelsen.</p>
              <p>To eksempler fra oktober 2026: En erhvervsmægler fortalte, at bankerne sjældent låner mere end 60 % til private købere af erhverv, så nu regner analysen med 40 % udbetaling. En professionel investor pegede på, at en fremskrivning af en ældre udlejningsejendom er for usikker, så nu vises tre scenarier med forsigtige tillæg i stedet for én prognose.</p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[16px]">
              <a href={site.phoneHref} className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-[#17213a]"><Phone size={17} strokeWidth={1.8} /> {site.phone}</a>
              <span className="select-all text-[#3c4153]">{site.email}</span>
              <span className="text-[#6f6c68]">CVR {site.business.cvr}</span>
            </div>
            <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#e4e0d8] bg-[#e4e0d8] sm:grid-cols-3">
              {[
                ["Samtale", "20 minutter om, hvordan du investerer, og hvad du har brug for."],
                ["Opsætning", "Dit område, din strategi og dit krav til overskud bliver lagt ind."],
                ["Adgang", "Du får en personlig invitation. Ingen binding."],
              ].map(([t, d], i) => (
                <li key={t} className="bg-[#f6f4ef] p-5">
                  <p className="text-[13px] font-semibold tabular-nums text-[#555661]">{i + 1}.</p>
                  <p className="mt-1 text-[17px] font-semibold text-[#17213a]">{t}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#3c4153]">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[#e4e0d8]">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <H2>Det spørger investorer om</H2>
            <p className="mt-5 text-[17px] text-[#3c4153]">Er dit spørgsmål ikke her? <Link href="/kontakt?emne=spoergsmaal" className="font-semibold text-[#17213a] underline underline-offset-4">Skriv til os</Link>.</p>
            <p className="mt-6 text-[15px] text-[#555661]">Ny som investor? <Link href="/spil" className="font-semibold text-[#17213a] underline underline-offset-4">Øv dig i Ejendomsspillet</Link>, hvor du køber og lejer ud i en dansk by.</p>
          </div>
          <Faq items={FAQ} />
        </div>
      </section>

      {/* Final call to action */}
      <section className="bg-[#17213a] text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-16 sm:px-8 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <H2 dark>Lad os tage en samtale om dine ejendomme</H2>
            <p className="mt-5 text-[17px] leading-relaxed text-white/70">20 minutter om, hvad du ejer, hvad du vil købe, og hvor det i dag tager tid eller føles usikkert. Passer NordInvest ikke til dig, siger jeg det.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Cta dark />
            <Link href="/kontakt" className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-white/30 px-5 text-[16px] font-semibold text-white hover:border-white/60 max-sm:w-full">Kontakt os</Link>
          </div>
        </div>
        <div className="mx-auto max-w-[1200px] px-4 pb-10 sm:px-8"><Suspense><HaveAccount dark /></Suspense></div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />

      <Footer />
    </div>
  );
}
