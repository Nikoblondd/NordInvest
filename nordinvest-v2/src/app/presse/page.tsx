import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getDealSnapshot, type DealSnapshot } from "@/lib/deals-snapshot";
import { DEAL_CITIES, type DealCity } from "@/lib/deal-cities";
import { site } from "@/lib/site";

// Live Deal-motor figures (cached 6 h); a static build would bake in nothing.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const metadata: Metadata = {
  title: { absolute: "Presse: boligdata om udlejning pr. kommune · NordInvest" },
  description:
    "Hvor mange boliger til salg giver positivt cashflow som udlejning? Live tal for hele Danmark og 16 kommuner, med metode, citerbare sætninger og kontakt til NordInvest.",
  alternates: { canonical: "/presse" },
};

type Row = { city: DealCity; snap: DealSnapshot };

const n = (x: number) => Math.round(x).toLocaleString("da-DK");
const share = (s: DealSnapshot) => {
  if (!s.scanned) return "–";
  const p = Math.round((s.positive / s.scanned) * 100);
  return p === 0 && s.positive > 0 ? "under 1\u00a0%" : `${p}\u00a0%`;
};
const yieldPct = (y: number | null) => (y == null ? "–" : `${y.toFixed(1).replace(".", ",")}\u00a0%`);
const dateDa = (iso: string) =>
  new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" }).format(new Date(iso));

export default async function PressePage() {
  const [national, ...cities] = await Promise.all([
    getDealSnapshot(null, 10).catch(() => null),
    ...DEAL_CITIES.map((c) => getDealSnapshot(c.slug, 8).catch(() => null)),
  ]);
  const rows: Row[] = DEAL_CITIES.map((city, i) => ({ city, snap: cities[i] as DealSnapshot | null }))
    .filter((r): r is Row => !!r.snap && r.snap.scanned > 0)
    .sort((a, b) => b.snap.positive / b.snap.scanned - a.snap.positive / a.snap.scanned);
  const top = rows[0];
  const bottom = rows[rows.length - 1];
  const cph = rows.find((r) => r.city.slug === "koebenhavn");
  const asOf = national ? dateDa(national.updated) : dateDa(new Date().toISOString());

  const quotes = [
    national &&
      `${n(national.positive)} af ${n(national.scanned)} helårsboliger til salg i Danmark giver positivt cashflow som udlejning med 20 % udbetaling og 5 % rente, viser NordInvests gennemgang (${asOf}).`,
    top && cph &&
      `${top.city.in.charAt(0).toUpperCase() + top.city.in.slice(1)} giver ${share(top.snap)} af boligerne til salg positivt cashflow som udlejning. I København er det ${share(cph.snap)}, ifølge NordInvest (${asOf}).`,
    bottom && bottom !== cph &&
      `${bottom.city.in.charAt(0).toUpperCase() + bottom.city.in.slice(1)} giver ${bottom.snap.positive === 0 ? "ingen" : `kun ${n(bottom.snap.positive)}`} af de ${n(bottom.snap.scanned)} boliger til salg positivt cashflow som udlejning, ifølge NordInvest (${asOf}).`,
  ].filter(Boolean) as string[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: "Boliger til salg med positivt cashflow som udlejning, pr. kommune",
        description:
          "Andel af helårsboliger (ejerlejligheder, villaer, rækkehuse) til salg i Danmark, der giver positivt månedligt cashflow som udlejning med 20 % udbetaling og 5 % rente. Opdateres hver 6. time.",
        url: `${site.url}/presse`,
        creator: { "@id": `${site.url}/#organization` },
        inLanguage: "da-DK",
        spatialCoverage: "Danmark",
        ...(national ? { dateModified: national.updated } : {}),
        variableMeasured: ["Boliger til salg", "Boliger med positivt cashflow", "Median kvadratmeterpris", "Median bruttoafkast"],
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Forside", item: site.url },
          { "@type": "ListItem", position: 2, name: "Presse", item: `${site.url}/presse` },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <div className="mx-auto max-w-[1080px] px-4 pb-20 pt-28 sm:px-6">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-blue-700">Presse</p>
        <h1 className="mt-3 max-w-3xl text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[52px]">
          Hvor kan en udlejningsbolig betale sig selv?
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-slate-600">
          NordInvest regner alle helårsboliger til salg i Danmark igennem som udlejning og opdaterer tallene hver 6. time.
          Brug gerne tallene med kildeangivelsen &quot;NordInvest&quot; og et link til nordinvest.io. Tallene på siden er fra {asOf}.
        </p>

        {national && (
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-4">
            {[
              ["Helårsboliger til salg", n(national.scanned)],
              ["Med positivt cashflow", `${n(national.positive)} (${share(national)})`],
              ["Median pr. m²", national.medianPricePerM2 ? `${n(national.medianPricePerM2)} kr.` : "–"],
              ["Median bruttoafkast", yieldPct(national.medianGrossYield)],
            ].map(([k, v]) => (
              <div key={k} className="bg-white p-5">
                <dt className="text-[13px] font-medium text-slate-500">{k}</dt>
                <dd className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.02em] sm:text-[28px]">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {quotes.length > 0 && (
          <section aria-labelledby="citater-h" className="mt-14">
            <h2 id="citater-h" className="text-[24px] font-semibold tracking-[-0.02em]">Sætninger, I må bruge</h2>
            <ul className="mt-5 space-y-3">
              {quotes.map((q) => (
                <li key={q} className="rounded-2xl border border-slate-200 bg-white p-5 text-[16px] leading-relaxed text-slate-800">
                  {q}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="byer-h" className="mt-14">
          <h2 id="byer-h" className="text-[24px] font-semibold tracking-[-0.02em]">Tallene pr. kommune</h2>
          <p className="mt-2 text-[15px] text-slate-600">Sorteret efter andelen af boliger med positivt cashflow.</p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead className="border-b border-slate-200 text-[13px] text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Kommune</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Til salg</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Med plus</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Andel</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Median pr. m²</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Bruttoafkast</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {rows.map(({ city, snap }) => (
                  <tr key={city.slug}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link href={`/deals/${city.slug}`} className="text-blue-700 hover:underline">{city.name}</Link>
                    </th>
                    <td className="px-4 py-3 text-right">{n(snap.scanned)}</td>
                    <td className="px-4 py-3 text-right">{n(snap.positive)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{share(snap)}</td>
                    <td className="px-4 py-3 text-right">{snap.medianPricePerM2 ? `${n(snap.medianPricePerM2)} kr.` : "–"}</td>
                    <td className="px-4 py-3 text-right">{yieldPct(snap.medianGrossYield)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="metode-h" className="mt-14 grid gap-10 md:grid-cols-2">
          <div>
            <h2 id="metode-h" className="text-[24px] font-semibold tracking-[-0.02em]">Sådan er tallene regnet</h2>
            <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-slate-700">
              <li>Alle ejerlejligheder, villaer og rækkehuse til salg. Sommerhuse og landbrug er udeladt, fordi de ikke kan lejes ud hele året.</li>
              <li>Købet finansieres med 20 % udbetaling og 5 % rente.</li>
              <li>Lejen er anslået ud fra areal og en lejesats pr. m² for området. Det er et estimat, ikke en faktisk lejeaftale.</li>
              <li>Ejerudgiften tages fra annoncen. Mangler den, bruges et gennemsnit for boligtypen.</li>
              <li>Positivt cashflow betyder, at lejen dækker lån, drift og ejerudgift hver måned.</li>
            </ul>
            <p className="mt-4 text-[15px] text-slate-600">
              Hele metoden: <Link href="/methodology" className="font-medium text-blue-700 hover:underline">nordinvest.io/methodology</Link>
            </p>
          </div>
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Kontakt</h2>
            <div className="mt-4 flex items-center gap-4">
              <Image src={site.founder.photo} alt={`${site.founder.name}, stifter af NordInvest`} width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover" />
              <div className="text-[15px] leading-relaxed">
                <p className="font-semibold">{site.founder.name}, stifter</p>
                <p>
                  <a href={`mailto:${site.email}`} className="text-blue-700 hover:underline">{site.email}</a> ·{" "}
                  <a href={site.phoneHref} className="whitespace-nowrap text-blue-700 hover:underline">{site.phone}</a>
                </p>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              Stiller gerne op til interview og regner tallene for en bestemt by, boligtype eller rente, hvis I har brug for det.
            </p>
            <p className="mt-4 text-[15px]">
              <a href="/nordinvest-logo.png" download className="font-medium text-blue-700 hover:underline">Download logo (PNG)</a>
            </p>
            <p className="mt-6 text-[13px] leading-relaxed text-slate-500">
              {site.business.legalName}, CVR {site.business.cvr}. NordInvest har ingen forbindelse til Nordnet, NORD.investments, Nord-Invest ApS eller Nordinvest AB.
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
