import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { LandingNav } from "@/components/landing/LandingNav";
import { TryButton } from "@/components/landing/TryModal";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
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
 * Hallmark · genre: editorial · macrostructure: Long Document (investeringsnotat)
 * theme: paper/ink/brick (design.md) · enrichment: none (typography + one real table)
 * nav: N9 edge-aligned · footer: Ft4 colophon · reveal: none
 *
 * The page reads like an analysis note: dated, one column at reading measure,
 * a worked example on today's real top property with footnoted sources, the
 * method in prose, and a signature. No hero/feature/CTA template rhythm.
 */

const P = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={`text-[18px] leading-[1.7] text-[var(--color-ink-2)] ${className ?? ""}`}>{children}</p>
);
const H2 = ({ children, id }: { children: ReactNode; id?: string }) => (
  <h2 id={id} className="mt-16 scroll-mt-20 text-[28px] font-semibold leading-[1.2] text-[var(--color-ink)] sm:text-[32px]">{children}</h2>
);
const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="font-medium text-[var(--color-ink)] underline decoration-[var(--color-accent)] decoration-1 underline-offset-[5px] hover:decoration-2">{children}</Link>
);
const Fn = ({ n }: { n: number }) => <sup className="ml-0.5 font-[family-name:var(--font-mono)] text-[11px] font-medium text-[var(--color-accent)]">{n}</sup>;

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n)).toLocaleString("da-DK")} kr.`;
const pct = (n: number) => `${n.toLocaleString("da-DK", { maximumFractionDigits: 1 })} %`;

const FAQ: [string, string][] = [
  ["Hvad er NordInvest?", "Et dansk analyseværktøj og system til private ejendomsinvestorer og erhvervsmæglere, bygget af Nikolaj Blond (CVR 44701898). Det regner boliger og udlejningsejendomme igennem med sælgers tal og offentlige data og samler fremvisninger, bank og bud på hver bolig. NordInvest har ingen forbindelse til Nordnet, NORD.investments, Nord-Invest ApS eller Nordinvest AB."],
  ["Hvor præcise er tallene?", "Så præcise som det, de bygger på, og det står ved hvert tal. Sælgers driftsbudget vises, som det er. NordInvests egne skøn står for sig, og fremtiden vises som tre scenarier, ikke som én prognose. Lejeliste, regnskab og en teknisk gennemgang erstatter analysen ikke, og det står i den."],
  ["Hvad koster det?", "Prisen aftaler vi efter samtalen, ud fra hvor meget du køber, og hvad du skal bruge. Der er ingen binding."],
  ["Hvorfor skal man anmode om adgang?", "Fordi analysen bliver bedre, når den er sat op efter dit område, din strategi og din finansiering. Det gør vi i samtalen, og bagefter har du en, du kan ringe til."],
  ["Er det rådgivning?", "Nej. NordInvest giver beregninger og overblik. Beslutningen er din, og ved køb anbefaler vi altid en købers rådgiver."],
];

/** Today's top-ranked home, written out as the first page of a note. */
function Example({ d }: { d: SnapshotDeal }) {
  const rent = (d.grossYield * d.price) / 1200;
  const noi = (d.capRate * d.price) / 1200;
  const costs = rent - noi;
  const loan = noi - d.cashFlow;
  const street = d.address.split(",")[0];
  const rows: [string, string, number][] = [
    ["Udbudspris", kr(d.price), 1],
    ["Markedsleje pr. måned", kr(rent), 2],
    ["Ejerudgift, drift og vedligehold", signed(-costs), 3],
    ["Ydelse på lån, 80 % af prisen", signed(-loan), 4],
  ];
  return (
    <figure className="mt-8">
      <table className="w-full border-t-2 border-[var(--color-ink)] text-[16px]">
        <caption className="pb-3 text-left text-[15px] text-[var(--color-muted)]">
          <Link href={d.href} className="font-semibold text-[var(--color-ink)] underline decoration-[var(--color-accent)] underline-offset-4">{street}, {d.zip} {d.city}</Link>
          {[d.area ? `${d.area} m²` : "", d.rooms ? `${d.rooms} værelser` : ""].filter(Boolean).map((x) => `, ${x}`).join("")}. Beløb pr. måned
        </caption>
        <tbody className="tabular-nums">
          {rows.map(([k, v, n]) => (
            <tr key={k} className="border-b border-[var(--color-rule)]">
              <th scope="row" className="py-2.5 pr-4 text-left font-normal text-[var(--color-ink-2)]">{k}<Fn n={n} /></th>
              <td className="py-2.5 text-right text-[var(--color-ink)]">{v}</td>
            </tr>
          ))}
          <tr className="border-b-2 border-[var(--color-ink)]">
            <th scope="row" className="py-3 pr-4 text-left font-semibold text-[var(--color-ink)]">Cash flow</th>
            <td className={`py-3 text-right text-[18px] font-semibold ${d.cashFlow >= 0 ? "text-emerald-800" : "text-rose-700"}`}>{signed(d.cashFlow)}</td>
          </tr>
        </tbody>
      </table>
      <figcaption className="mt-3 font-[family-name:var(--font-mono)] text-[12.5px] leading-relaxed text-[var(--color-muted)]">
        <span className="text-[var(--color-accent)]">1</span> Boligsiden, annoncen. <span className="text-[var(--color-accent)]">2</span> NordInvests skøn ud fra postnummer og størrelse. <span className="text-[var(--color-accent)]">3</span> Ejerudgift fra annoncen, vedligehold 8 % og tomgang 4 % af lejen. <span className="text-[var(--color-accent)]">4</span> 20 % udbetaling, 5 % rente, 30 år. Nettoafkast {pct(d.capRate)}.
      </figcaption>
    </figure>
  );
}

export default async function Home() {
  const snap = await getDealSnapshot(null, 4).catch(() => null);
  const top = snap?.top?.[0] ?? null;
  const when = snap
    ? new Date(snap.updated).toLocaleString("da-DK", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" })
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] antialiased">
      <LandingNav />

      <main className="mx-auto max-w-[1120px] px-4 sm:px-8">
        <article className="mx-auto max-w-[680px] pb-24 pt-14 sm:pt-20">
          {when && snap && (
            <p className="font-[family-name:var(--font-mono)] text-[13px] text-[var(--color-muted)]">
              {when.charAt(0).toUpperCase() + when.slice(1)}. {snap.scanned.toLocaleString("da-DK")} boliger til salg er regnet igennem i dag.
            </p>
          )}
          <h1 className="mt-5 text-[36px] font-semibold leading-[1.12] text-[var(--color-ink)] [overflow-wrap:anywhere] sm:text-[48px]">
            Ejendomsanalyse med kilde på hvert tal.
          </h1>
          <P className="mt-6 text-[19px]">
            NordInvest regner udlejningsboliger og udlejningsejendomme igennem med sælgers driftsbudget, BBR, den offentlige vurdering og dagens realkreditrente. Du ser, hvad ejendommen giver efter lånet, hvad driften kan tåle, og hvad du mangler at få styr på, før du byder.
          </P>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/adgang" className="inline-flex min-h-[48px] items-center whitespace-nowrap rounded-lg bg-[var(--color-ink)] px-5 text-[16px] font-semibold text-white transition-colors hover:bg-[var(--color-ink-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2">Anmod om adgang</Link>
            <TryButton className="inline-flex min-h-[44px] items-center whitespace-nowrap text-[16px] font-medium text-[var(--color-ink)] underline decoration-[var(--color-accent)] underline-offset-[5px] hover:decoration-2">Prøv en beregning uden login</TryButton>
          </div>
          <Suspense><HaveAccount className="mt-4" /></Suspense>

          {top && (
            <>
              <H2 id="eksempel">Et eksempel fra i dag</H2>
              <P className="mt-4">
                Øverst i Deal-motoren står i dag {top.address.split(",")[0]} i {top.city}. Sådan ser regnestykket ud på første side af analysen. Tallet nederst er det, der er tilbage hver måned, når lånet er betalt.
              </P>
              <Example d={top} />
            </>
          )}

          <H2 id="analysen">Hvad en analyse indeholder</H2>
          <P className="mt-4">
            <b className="font-semibold text-[var(--color-ink)]">Sælgers tal, som de er.</b> Lejeindtægt, driftsudgifter og driftsresultat fra annoncen, hver med sin kilde. Har du lejeliste og regnskab, skriver du de faktiske tal ind, og alt regnes om.
          </P>
          <P className="mt-4">
            <b className="font-semibold text-[var(--color-ink)]">Et forsigtigt år 1.</b> Ekstra vedligehold efter bygningens alder i BBR og et tillæg for lejetab. Begge står synligt og kan rettes.
          </P>
          <P className="mt-4">
            <b className="font-semibold text-[var(--color-ink)]">Hvad driften kan tåle.</b> Hvor meget driftsresultatet kan falde, før cash flow er nul, og hvad der sker, hvis lejen falder, udgifterne stiger eller renten går op. Målt på i dag, uden at fremskrive noget.
          </P>
          <P className="mt-4">
            <b className="font-semibold text-[var(--color-ink)]">Tjek mod registrene.</b> Sælgers leje holdt op mod markedslejen for hver bolig i BBR, driftsudgifterne mod kommunens grundskyld og prisen mod den offentlige vurdering. Asbest i taget, oliefyr og gas bliver markeret.
          </P>
          <P className="mt-4">
            <b className="font-semibold text-[var(--color-ink)]">Ti år som tre scenarier.</b> Forsigtig, middel og positiv, med åbne forudsætninger, hvor udgifterne stiger mindst lige så hurtigt som lejen. Ikke en prognose.
          </P>
          <P className="mt-6">
            Se en hel analyse af en rigtig sag: <A href="/e/schaldemosevej-3-ringsted">Schaldemosevej 3, Ringsted →</A>
          </P>

          <H2 id="kilder">Hvor tallene kommer fra</H2>
          <dl className="mt-6 divide-y divide-[var(--color-rule)] border-y border-[var(--color-rule)] text-[16px]">
            {[
              ["Boligsiden og Ejendomstorvet", "Pris, areal, ejerudgift, sælgers afkast og driftsudgifter."],
              ["BBR, via Datafordeler", "Hver bolig og erhvervsenhed med areal, byggeår, tag, facade og varme."],
              ["Ejendomsvurderingen", "Ejendomsværdi og grundværdi."],
              ["Danmarks Statistik", "Grundskyldspromille for alle 98 kommuner, prisindeks og huslejeindeks."],
              ["Danmarks Nationalbank", "Renten inklusive bidrag på nye realkreditlån, hver måned."],
              ["Plandata.dk", "Lokalplaner, forslag og kloakoplande."],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-6">
                <dt className="font-semibold text-[var(--color-ink)]">{k}</dt>
                <dd className="text-[var(--color-ink-2)]">{v}</dd>
              </div>
            ))}
          </dl>
          <P className="mt-5 text-[16px]">
            Antagelser og ændringer i modellen står i <A href="/methodology#investeringsejendomme">metodebeskrivelsen og versionsloggen</A>.
          </P>

          <H2 id="systemet">Når der er flere boliger i spil</H2>
          <P className="mt-4">
            Hver bolig, du gemmer, bliver en sag med analyse, papirer, fremvisninger, bank og bud samlet ét sted. Søgeagenter holder øje med markedet efter dine krav, og du får en mail dagen før en fremvisning. Når du har købt, følger lejere, husleje og faktisk cash flow med på samme sag. Læs mere om <A href="/funktioner">funktionerne</A>, eller se <A href="/deals">dagens bedste boliger</A>.
          </P>

          <H2 id="bag">Hvem står bag</H2>
          <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)] sm:items-start">
            <figure>
              <Image src="/founder.jpg" alt={`${site.founder.name}, stifter af NordInvest`} width={320} height={400} className="aspect-[4/5] w-[140px] rounded-md object-cover sm:w-full" />
            </figure>
            <div>
              <P>Jeg hedder {site.founder.name.split(" ")[0]} og har bygget NordInvest, beregningsmodellen og dataintegrationerne. Jeg står selv for tallene. Finder du en fejl, så ring til mig, og så retter jeg den.</P>
              <P className="mt-4">I oktober 2026 fortalte en erhvervsmægler, at bankerne sjældent låner mere end 60 % til private købere af erhverv. Nu regner analysen med 40 % udbetaling. En professionel investor pegede på, at en fremskrivning af en ældre udlejningsejendom er for usikker. Nu vises tre scenarier med forsigtige tillæg.</P>
              <p className="mt-6 font-[family-name:var(--font-display)] text-[22px] font-semibold text-[var(--color-ink)]">{site.founder.name}</p>
              <p className="mt-1 text-[15px] text-[var(--color-ink-2)]">
                <a href={site.phoneHref} className="font-medium text-[var(--color-ink)] underline decoration-[var(--color-accent)] underline-offset-4">{site.phone}</a>
                <span className="mx-2 text-[var(--color-rule)]" aria-hidden>|</span>
                <span className="select-all">{site.email}</span>
              </p>
            </div>
          </div>

          <H2 id="spoergsmaal">Spørgsmål</H2>
          <div className="mt-2">
            {FAQ.map(([q, a]) => (
              <div key={q} className="mt-6">
                <h3 className="text-[19px] font-semibold text-[var(--color-ink)]">{q}</h3>
                <P className="mt-1.5 text-[17px]">{a}</P>
              </div>
            ))}
          </div>

          <div className="mt-16 border-t-2 border-[var(--color-ink)] pt-8">
            <P>Adgang gives efter en samtale på 20 minutter om, hvad du ejer, og hvad du vil købe. Passer NordInvest ikke til dig, siger jeg det.</P>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/adgang" className="inline-flex min-h-[48px] items-center whitespace-nowrap rounded-lg bg-[var(--color-ink)] px-5 text-[16px] font-semibold text-white transition-colors hover:bg-[var(--color-ink-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2">Anmod om adgang</Link>
              <A href="/kontakt">Skriv til os</A>
            </div>
          </div>
        </article>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }) }} />

      <Footer />
    </div>
  );
}
