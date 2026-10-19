import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Phone } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { TryButton } from "@/components/landing/TryModal";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Faq } from "@/components/landing/Faq";
import { getDealSnapshot, type SnapshotDeal } from "@/lib/deals-snapshot";
import { getLink } from "@/lib/broker/links";
import { budget, findings, type Finding } from "@/lib/investment-ops";
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
 * Landing page (Oct 2026). White, modern and plain: one strong headline, a
 * real analysis card on today's top property, the data sources, what an
 * analysis contains, a real example with its public-record checks, the person
 * behind it, FAQ. Every number on the page is live or taken from a real case.
 */

const Section = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={className}><div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-8 sm:py-24">{children}</div></section>
);
const H2 = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={`text-[32px] font-semibold leading-[1.15] tracking-[-0.025em] text-slate-900 [text-wrap:balance] sm:text-[40px] ${className ?? ""}`}>{children}</h2>
);
const Lead = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={`mt-4 max-w-[38rem] text-[18px] leading-relaxed text-slate-600 ${className ?? ""}`}>{children}</p>
);
const Primary = ({ href = "/adgang", children }: { href?: string; children: ReactNode }) => (
  <Link href={href} className="inline-flex min-h-[48px] items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-5 text-[16px] font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 max-sm:w-full">{children}</Link>
);

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n)).toLocaleString("da-DK")} kr.`;
const pct = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %`;
const Tag = ({ children }: { children: ReactNode }) => <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{children}</span>;

const FAQ = [
  { q: "Hvad er NordInvest?", a: "Et dansk analyseværktøj og system til private ejendomsinvestorer og erhvervsmæglere, bygget af Nikolaj Blond (CVR 44701898). Det regner boliger og udlejningsejendomme igennem med sælgers tal og offentlige data og samler fremvisninger, bank og bud på hver bolig. NordInvest har ingen forbindelse til Nordnet, NORD.investments, Nord-Invest ApS eller Nordinvest AB." },
  { q: "Hvor præcise er tallene?", a: "Så præcise som det, de bygger på, og det står ved hvert tal. Sælgers driftsbudget vises, som det er. NordInvests egne skøn står for sig, og fremtiden vises som tre scenarier, ikke som én prognose. Lejeliste, regnskab og en teknisk gennemgang erstatter analysen ikke, og det står i den." },
  { q: "Hvad koster det?", a: "Prisen aftaler vi efter samtalen, ud fra hvor meget du køber, og hvad du skal bruge. Der er ingen binding." },
  { q: "Hvorfor skal man anmode om adgang?", a: "Fordi analysen bliver bedre, når den er sat op efter dit område, din strategi og din finansiering. Det gør vi i samtalen, og bagefter har du en, du kan ringe til." },
  { q: "Er det rådgivning?", a: "Nej. NordInvest giver beregninger og overblik. Beslutningen er din, og ved køb anbefaler vi altid en købers rådgiver." },
];

const CONTENTS: [string, string][] = [
  ["Sælgers tal, som de er", "Lejeindtægt, driftsudgifter og driftsresultat fra annoncen, hver med sin kilde. Har du lejeliste og regnskab, skriver du de faktiske tal ind, og alt regnes om."],
  ["Et forsigtigt år 1", "Ekstra vedligehold efter bygningens alder i BBR og et tillæg for lejetab, synligt og til at rette."],
  ["Hvad driften kan tåle", "Hvor meget driftsresultatet kan falde, før cash flow er nul, og hvad der sker, hvis lejen falder, udgifterne stiger eller renten går op."],
  ["Tjek mod registrene", "Sælgers leje mod markedslejen for hver bolig i BBR, driftsudgifterne mod kommunens grundskyld og prisen mod den offentlige vurdering."],
  ["Ti år som tre scenarier", "Forsigtig, middel og positiv, hvor udgifterne stiger mindst lige så hurtigt som lejen. Ikke en prognose."],
];

/** Today's top-ranked home as a compact analysis card. */
function PreviewCard({ d, updated }: { d: SnapshotDeal; updated: string }) {
  const rent = (d.grossYield * d.price) / 1200;
  const noi = (d.capRate * d.price) / 1200;
  const at = new Date(updated).toLocaleDateString("da-DK", { day: "numeric", month: "long", timeZone: "Europe/Copenhagen" });
  return (
    <Link href={d.href} className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_48px_-24px_rgba(16,24,40,0.22)] transition-shadow hover:shadow-[0_1px_2px_rgba(16,24,40,0.05),0_28px_56px_-24px_rgba(16,24,40,0.28)]">
      {d.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.image} alt={`${d.address}, øverst i Deal-motoren`} className="aspect-[16/9] w-full object-cover" fetchPriority="high" />
      )}
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[18px] font-semibold text-slate-900">{d.address.split(",")[0]}</p>
            <p className="text-[14px] text-slate-500">{d.zip} {d.city}{d.area ? ` · ${d.area} m²` : ""}</p>
          </div>
          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[12px] font-medium text-slate-600">Nr. 1 i dag, {at}</span>
        </div>
        <dl className="mt-4 divide-y divide-slate-100 text-[15px] tabular-nums">
          <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">Udbudspris<Tag>annonce</Tag></dt><dd className="text-slate-900">{kr(d.price)}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">Markedsleje pr. md.<Tag>skøn</Tag></dt><dd className="text-slate-900">{kr(rent)}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">Drift og vedligehold<Tag>skøn</Tag></dt><dd className="text-slate-900">{signed(-(rent - noi))}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-slate-600">Ydelse, 80 % lån<Tag>5 %</Tag></dt><dd className="text-slate-900">{signed(-(noi - d.cashFlow))}</dd></div>
          <div className="flex items-baseline justify-between gap-3 pt-3"><dt className="font-semibold text-slate-900">Cash flow pr. md.</dt><dd className={`text-[20px] font-semibold ${d.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signed(d.cashFlow)}</dd></div>
        </dl>
        <p className="mt-3 flex items-center justify-between text-[14px]">
          <span className="text-slate-500">Nettoafkast {pct(d.capRate)}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-900 group-hover:underline">Hele analysen <ArrowRight size={15} /></span>
        </p>
      </div>
    </Link>
  );
}

const DOT: Record<Finding["tone"], string> = { good: "bg-emerald-500", info: "bg-slate-400", warn: "bg-amber-500", bad: "bg-rose-500" };

export default async function Home() {
  const [snap, example] = await Promise.all([getDealSnapshot(null, 4).catch(() => null), getLink("schaldemosevej-3-ringsted").catch(() => null)]);
  const top = snap?.top?.[0] ?? null;
  const exFacts = example ? { price: example.price, noi: example.rent * 12, opex: example.opex ?? null, area: example.area ?? null, builtYear: example.builtYear ?? null, subcat: example.subcat } : null;
  const exFindings = example?.dossier && exFacts ? findings(exFacts, budget(exFacts), example.dossier) : [];

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <LandingNav />

      {/* Hero */}
      <section>
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-16 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:pb-24">
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-slate-500">Til private investorer og erhvervsmæglere</p>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.06] tracking-[-0.03em] text-slate-900 [hyphens:auto] [text-wrap:balance] sm:text-[56px]">
              Ejendomsanalyse med kilde på hvert tal
            </h1>
            <Lead className="mt-6 text-[19px]">
              NordInvest regner udlejningsboliger og udlejningsejendomme igennem med sælgers driftsbudget, BBR, den offentlige vurdering og dagens realkreditrente. Du ser, hvad ejendommen giver efter lånet, hvad driften kan tåle, og hvad du mangler at få styr på, før du byder.
            </Lead>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <Primary>Anmod om adgang <ArrowRight size={17} /></Primary>
              <TryButton className="inline-flex min-h-[48px] items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-900 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200">Prøv en beregning</TryButton>
            </div>
            <Suspense><HaveAccount className="mt-4" /></Suspense>
            {snap && (
              <p className="mt-10 text-[14px] text-slate-500">
                <b className="font-semibold text-slate-900">{snap.scanned.toLocaleString("da-DK")}</b> boliger til salg regnet igennem i dag · <b className="font-semibold text-slate-900">{snap.positive.toLocaleString("da-DK")}</b> af dem betaler sig selv
              </p>
            )}
          </div>
          <div className="mx-auto w-full max-w-[460px] lg:mx-0 lg:justify-self-end">
            {top && snap ? <PreviewCard d={top} updated={snap.updated} /> : null}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="shrink-0 text-[14px] font-medium text-slate-500">Analysen bygger på data fra</p>
          <ul className="flex flex-wrap gap-x-8 gap-y-2 text-[15px] font-semibold text-slate-700">
            {["BBR", "Ejendomsvurderingen", "Danmarks Statistik", "Danmarks Nationalbank", "Plandata.dk", "Boligsiden", "Ejendomstorvet"].map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      </section>

      {/* What an analysis contains */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <H2>Hvad en analyse indeholder</H2>
            <Lead>Analysen skiller sælgers tal, offentlige registre og NordInvests egne skøn ad, så du kan se, hvad der er dokumenteret, og hvad der er antaget.</Lead>
            <Link href="/methodology#investeringsejendomme" className="mt-6 inline-flex items-center gap-1.5 text-[16px] font-semibold text-slate-900 hover:underline">Metode og versionslog <ArrowRight size={16} /></Link>
          </div>
          <ol className="divide-y divide-slate-200 border-y border-slate-200">
            {CONTENTS.map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 py-5">
                <span className="pt-0.5 text-[15px] font-semibold tabular-nums text-slate-400">{String(i + 1).padStart(2, "0")}</span>
                <div><p className="text-[18px] font-semibold text-slate-900">{t}</p><p className="mt-1 text-[16px] leading-relaxed text-slate-600">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* A real example */}
      {example && exFindings.length > 0 && (
        <Section className="bg-slate-50">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <div>
              <H2>Et rigtigt eksempel</H2>
              <Lead>Schaldemosevej 3 i Ringsted: fem lejligheder, bygget 1912 og til salg for {kr(example.price)} Sådan ser tjekket mod de offentlige registre ud.</Lead>
              <div className="mt-8"><Primary href="/e/schaldemosevej-3-ringsted">Se hele analysen <ArrowRight size={17} /></Primary></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_32px_-20px_rgba(16,24,40,0.18)]">
              <p className="border-b border-slate-100 px-5 py-4 text-[15px] font-semibold text-slate-900 sm:px-6">Tjek mod offentlige registre</p>
              <ul className="divide-y divide-slate-100">
                {exFindings.slice(0, 4).map((f) => (
                  <li key={f.title} className="flex gap-3 px-5 py-4 sm:px-6">
                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT[f.tone]}`} aria-hidden />
                    <div className="min-w-0"><p className="text-[15px] font-semibold text-slate-900">{f.title}</p><p className="mt-0.5 text-[14px] leading-relaxed text-slate-600">{f.note}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      )}

      {/* Person */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] lg:gap-16">
          <Image src="/founder.jpg" alt={`${site.founder.name}, stifter af NordInvest`} width={480} height={600} className="aspect-[4/5] w-full max-w-[300px] rounded-2xl object-cover" />
          <div>
            <H2>Jeg står selv for tallene</H2>
            <Lead>Jeg hedder {site.founder.name.split(" ")[0]} og har bygget NordInvest, beregningsmodellen og dataintegrationerne. Finder du en fejl, så ring til mig, og så retter jeg den.</Lead>
            <Lead>I oktober fortalte en erhvervsmægler, at bankerne sjældent låner mere end 60 % til private købere af erhverv. Nu regner analysen med 40 % udbetaling. En professionel investor pegede på, at en fremskrivning af en ældre udlejningsejendom er for usikker. Nu vises tre scenarier med forsigtige tillæg.</Lead>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[16px]">
              <a href={site.phoneHref} className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-slate-900 hover:underline"><Phone size={17} /> {site.phone}</a>
              <span className="select-all text-slate-600">{site.email}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="border-t border-slate-200">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-20">
          <div>
            <H2>Spørgsmål</H2>
            <Lead>Er dit spørgsmål ikke her? <Link href="/kontakt?emne=spoergsmaal" className="font-semibold text-slate-900 underline underline-offset-4">Skriv til os</Link>.</Lead>
          </div>
          <Faq items={FAQ} />
        </div>
      </Section>

      {/* Call to action */}
      <section className="pb-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
          <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[34px]">Tag en samtale om dine ejendomme</h2>
              <p className="mt-3 text-[17px] leading-relaxed text-slate-600">20 minutter om, hvad du ejer, og hvad du vil købe. Passer NordInvest ikke til dig, siger jeg det.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Primary>Anmod om adgang <ArrowRight size={17} /></Primary>
              <Link href="/kontakt" className="inline-flex min-h-[48px] items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-900 hover:border-slate-400 max-sm:w-full">Kontakt os</Link>
            </div>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />

      <Footer />
    </div>
  );
}
