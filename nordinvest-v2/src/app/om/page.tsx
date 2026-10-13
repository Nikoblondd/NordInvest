import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { getDealSnapshot } from "@/lib/deals-snapshot";

// Live Deal-motor figures below (cached 6 h); a static build would bake in null.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: { absolute: "Om NordInvest · hvem bygger boliganalysen, og hvorfor" },
  description:
    "NordInvest bygges af én person, i offentligt lys, for at gøre ejendomsdata tilgængeligt for alle danske investorer, ikke kun dem der har råd til en rådgiver.",
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${site.url}/om#aboutpage`,
  url: `${site.url}/om`,
  name: "Om NordInvest",
  description:
    "NordInvest er en dansk platform til analyse af ejendomsinvestering og et system til hele købet: søgeagenter, pipeline, kalender, bud og AI-gennemgang af papirerne. Adgang efter en personlig samtale.",
  about: { "@id": `${site.url}/#organization` },
  mainEntity: {
    "@type": "Person",
    name: site.founder.name,
    jobTitle: "Stifter"
    ,image: `${site.url}${site.founder.photo}`,
    worksFor: { "@id": `${site.url}/#organization` },
    sameAs: [site.linkedin],
  },
};

export default async function OmPage() {
  const snap = await getDealSnapshot(null, 1).catch(() => null);
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }} />
      <Nav />
      <article className="bg-cream-50 pt-32">
        <div className="container-x max-w-3xl pb-24">
          <p className="micro text-gold-600">Om NordInvest</p>
          <h1 className="mt-6 text-4xl md:text-6xl">
            Bygget af én person. For en hel branche.
          </h1>

          <p className="mt-6 text-[18px] font-medium leading-relaxed text-stone-800 sm:text-xl">
            NordInvest regner en bolig eller en erhvervsejendom igennem på under et minut. Du indsætter
            linket fra boligsiden og ser, hvad den tjener hver måned, hvad renten kan tåle, og hvad den kan
            blive til. Bagefter følger den boligen hele vejen: søgeagenter, fremvisninger, papirer, bank og bud.
          </p>

          <div className="mt-10 space-y-5 text-[17px] leading-relaxed text-stone-700 sm:space-y-6 sm:text-lg">
            <p>
              NordInvest startede med ét spørgsmål: Hvorfor tager det så lang tid
              at finde ud af, om en ejendom er en god investering?
            </p>
            <p>
              Jeg hedder Nikolaj. Jeg bygger NordInvest, fordi jeg mener, at data
              burde være tilgængeligt for alle, ikke kun for dem, der kan betale
              15.000 kr for en analyserapport.
            </p>
            <p>
              Jeg så investorer bruge hele weekender i det samme regneark for at
              vurdere én ejendom. Jeg så begyndere, der ikke turde tage springet,
              fordi tallene virkede uigennemsigtige. Og jeg så et marked, hvor de
              bedste værktøjer var forbeholdt professionelle.
            </p>
            <p>
              Målet er en dansk ejendomsplatform, der udligner spillefeltet. Ikke
              bare et værktøj, men et startpunkt for en generation, der investerer
              smartere end den forrige.
            </p>
          </div>

          <h2 className="mt-16 text-2xl font-semibold text-stone-900 md:text-3xl">Hvad tallene bygger på</h2>
          <p className="mt-4 text-lg leading-relaxed text-stone-700">
            Hver analyse samler offentlige data og markedsdata, som ellers ligger spredt, og viser for hvert tal, om det er
            dokumenteret eller et estimat. Metoden står åbent i <Link href="/methodology" className="font-medium text-stone-900 underline underline-offset-4">metodebeskrivelsen</Link>.
          </p>
          <ul className="mt-6 grid gap-3 text-[15px] text-stone-700 sm:grid-cols-2">
            {[
              ["BBR via Datafordeler", "areal, byggeår, anvendelse og installationer"],
              ["Danmarks Statistik", "realiserede prisudviklinger og huslejeindeks"],
              ["Plandata.dk", "lokalplaner, forslag og kloakoplande"],
              ["Aktive boligannoncer", "sammenlignelige priser og faste udgifter i samme postnummer"],
            ].map(([t, d]) => (
              <li key={t} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                <span className="block font-semibold text-stone-900">{t}</span>
                {d}
              </li>
            ))}
          </ul>
          {snap && snap.scanned > 0 && (
            <p className="mt-6 text-lg leading-relaxed text-stone-700">
              Lige nu har <Link href="/deals" className="font-medium text-stone-900 underline underline-offset-4">Deal-motoren</Link> regnet{" "}
              <strong className="tabular-nums text-stone-900">{snap.scanned.toLocaleString("da-DK")}</strong> boliger til salg igennem.{" "}
              <strong className="tabular-nums text-stone-900">{snap.positive.toLocaleString("da-DK")}</strong> af dem giver positivt cash flow som udlejning
              med 20&nbsp;% udbetaling og 5&nbsp;% rente.
            </p>
          )}

          <h2 className="mt-16 text-2xl font-semibold text-stone-900 md:text-3xl">Hvem står bag</h2>
          <div className="mt-6 flex items-center gap-5">
            <Image src={site.founder.photo} alt={`${site.founder.name}, stifter af NordInvest`} width={88} height={88} className="h-[88px] w-[88px] rounded-full object-cover" />
            <div>
              <p className="text-lg font-semibold text-stone-900">{site.founder.name}</p>
              <p className="text-stone-600">Stifter. Har bygget beregningsmotoren, dataintegrationerne, Deal-motoren og Analytikeren.</p>
            </div>
          </div>

          <h2 className="mt-16 text-2xl font-semibold text-stone-900 md:text-3xl">Virksomheden</h2>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px] text-stone-700">
            <dt className="font-medium text-stone-900">Navn</dt><dd>{site.business.legalName}</dd>
            <dt className="font-medium text-stone-900">Form</dt><dd>{site.business.entityType}</dd>
            <dt className="font-medium text-stone-900">CVR</dt><dd className="tabular-nums">{site.business.cvr}</dd>
            <dt className="font-medium text-stone-900">Adresse</dt><dd>{site.business.address}, {site.business.country}</dd>
            <dt className="font-medium text-stone-900">Kontakt</dt>
            <dd><a href={`mailto:${site.email}`} className="underline underline-offset-4">{site.email}</a> · <a href={site.phoneHref} className="whitespace-nowrap underline underline-offset-4">{site.phone}</a></dd>
          </dl>
          <p className="mt-6 text-[15px] leading-relaxed text-stone-600">
            Presse, samarbejde eller investering: skriv til <a href={`mailto:${site.email}`} className="underline underline-offset-4">{site.email}</a>, så svarer jeg selv.
          </p>

          <div className="mt-12 flex flex-wrap gap-3">
            <Button href="/analyseren">Analysér en bolig</Button>
            <Button href={site.linkedin} variant="secondary">Følg rejsen på LinkedIn →</Button>
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}
