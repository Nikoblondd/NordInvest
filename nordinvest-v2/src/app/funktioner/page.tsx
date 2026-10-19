import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OverviewScreen } from "@/components/landing/screens";
import { AccessBand, JsonLd, PublicShell, breadcrumbLd } from "@/components/public/PublicShell";
import { FEATURES } from "@/lib/features";
import { site } from "@/lib/site";

const TITLE = "Funktioner: analyse, søgeagenter og pipeline til investorer";
const DESCRIPTION = "Alt i NordInvest: boliganalyse med bankrapport, søgeagenter med AI, pipeline og kalender til købet og AI-gennemgang af salgsopstilling og referater.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/funktioner" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/funktioner", images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "NordInvest" }] },
};

const GUIDES = [
  { href: "/analyse-af-ejendomsinvestering", label: "Analyse af ejendomsinvestering i Danmark", text: "Sådan regner du en udlejningsbolig igennem, med regneeksempel." },
  { href: "/foraeldrekoeb", label: "Forældrekøb: regler, skat og beregning", text: "Markedsleje, de tre skatteordninger og hvad familien får ud af det." },
  { href: "/saadan-byder-du-paa-en-bolig", label: "Sådan byder du på en bolig", text: "Forbehold, modbud, svarfrist og hvordan du finder dit maksimale bud." },
  { href: "/salgsopstilling", label: "Sådan læser du en salgsopstilling", text: "Hvad tallene betyder, og hvor de dyre overraskelser gemmer sig." },
  { href: "/udlejningsejendomme-til-salg", label: "Udlejningsejendomme til salg", text: "De bedste udlejnings- og erhvervsejendomme på markedet lige nu, med afkast." },
  { href: "/deals", label: "De bedste investeringsboliger lige nu", text: "Deal-motorens rangering af hele det danske boligmarked." },
];

export default function FeaturesPage() {
  const crumbs = [{ href: "/funktioner", label: "Funktioner" }];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${site.url}/funktioner#webpage`, url: `${site.url}/funktioner`, name: TITLE, description: DESCRIPTION, inLanguage: "da-DK", isPartOf: { "@id": `${site.url}/#website` }, about: { "@id": `${site.url}/#app` } },
      { "@type": "ItemList", itemListElement: FEATURES.map((f, i) => ({ "@type": "ListItem", position: i + 1, url: `${site.url}/funktioner/${f.slug}`, name: f.nav })) },
      breadcrumbLd(crumbs),
    ],
  };
  return (
    <PublicShell crumbs={crumbs}>
      <JsonLd data={ld} />
      <section className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:px-8 lg:pt-12">
        <div>
          <p className="text-[14px] font-semibold text-blue-600">Funktioner</p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] text-[#17213a] [text-wrap:balance] sm:text-[48px]">Analysen først. Og et system til hele købet.</h1>
          <p className="mt-5 max-w-[36rem] text-[18px] leading-relaxed text-slate-600">
            NordInvest er bygget til private ejendomsinvestorer i Danmark. Kernen er analysen, der regner en bolig igennem på et minut. Rundt om den ligger det, der skal til for at købe: søgeagenter, der finder boligerne, en pipeline med kalender og bud, og AI, der læser papirerne.
          </p>
        </div>
        <div className="min-w-0"><OverviewScreen /></div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-4 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Link key={f.slug} href={`/funktioner/${f.slug}`} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-[0_20px_50px_-30px_rgba(11,27,51,0.4)]">
              <span className="text-[13px] font-semibold text-blue-600">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.02em] text-[#17213a]">{f.nav}</h2>
              <p className="mt-2 text-[16px] leading-relaxed text-slate-600">{f.lead}</p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[15px] font-semibold text-blue-700">Se hvordan det virker <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="max-w-3xl text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#17213a] sm:text-[38px]">Til udlejning, forældrekøb, renovering og erhverv</h2>
          <div className="mt-6 grid gap-6 text-[16px] leading-relaxed text-slate-700 md:grid-cols-2">
            <p><b className="text-slate-900">Udlejning:</b> analysen viser cash flow efter lån og drift, lejereserven og hvad lejeloven betyder for ældre boliger. Søgeagenter finder lejlighederne, hvor lejen betaler lånet.</p>
            <p><b className="text-slate-900">Forældrekøb:</b> sammenlign køb med leje over hele studietiden, efter skat ved salg, og tjek i vedtægterne, at foreningen tillader udlejning til barnet.</p>
            <p><b className="text-slate-900">Renovering og salg:</b> flip-analysen regner værdien efter renovering, et budget med rigtige materialepriser, skat og dit maksimale bud. Agenter finder billige kvadratmeter og ældre boliger.</p>
            <p><b className="text-slate-900">Erhverv:</b> udlejningsejendomme, butik og kontor regnes på driftsresultatet, med startafkast mod det normale niveau for ejendomstypen og rentestress på lånet.</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#17213a] sm:text-[38px]">Guides til købet</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => (
              <li key={g.href}><Link href={g.href} className="block h-full rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300"><span className="block text-[16px] font-semibold text-slate-900">{g.label}</span><span className="mt-1 block text-[14px] text-slate-600">{g.text}</span></Link></li>
            ))}
          </ul>
        </div>
      </section>
      <AccessBand />
    </PublicShell>
  );
}
