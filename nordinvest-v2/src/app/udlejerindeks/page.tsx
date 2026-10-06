import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { dateDa } from "@/components/deals/DealsSeo";
import { getUdlejerindeks, previousReading, monthKey, pct, dkn, MIN_SCANNED, type IndexRow } from "@/lib/udlejerindeks";
import { site } from "@/lib/site";

// Rendered per request (edge-cached for an hour); the index itself is cached 6 hours.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TITLE = "Udlejerindekset: hvor kan lejen betale lånet?";
const DESCRIPTION =
  "NordInvest Udlejerindeks rangerer alle danske kommuner efter, hvor stor en andel af boligerne til salg der giver positivt cashflow som udlejning. Opdateres hver 6. time.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/udlejerindeks" },
  openGraph: {
    title: `${TITLE} · NordInvest`,
    description: DESCRIPTION,
    url: "/udlejerindeks",
    type: "website",
    images: [{ url: "/api/og/udlejerindeks", width: 1200, height: 630, alt: "NordInvest Udlejerindeks: top 10 kommuner" }],
  },
};

function Move({ now, before }: { now: number | null; before: number | null | undefined }) {
  if (now == null) return <span className="text-slate-300">–</span>;
  if (before === undefined) return <span className="text-xs font-medium text-slate-400">ny</span>;
  if (before == null || before === now) return <span className="text-slate-300">–</span>;
  const up = before > now;
  return (
    <span className={`text-xs font-semibold tabular-nums ${up ? "text-emerald-700" : "text-rose-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(before - now)}
    </span>
  );
}

function Row({ r, before, showMove, max }: { r: IndexRow; before?: number | null; showMove: boolean; max: number }) {
  const name = r.page ? (
    <Link href={`/deals/${r.slug}`} className="font-semibold text-slate-900 underline-offset-2 hover:underline">
      {r.name}
    </Link>
  ) : (
    <span className="font-semibold text-slate-900">{r.name}</span>
  );
  const w = max > 0 ? Math.max(r.share / max, r.positive > 0 ? 0.02 : 0) : 0;
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)_6.5rem] items-center gap-x-3 px-3 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_14rem_8rem_4rem] sm:gap-x-5 sm:px-5">
      <span className="text-sm font-semibold tabular-nums text-slate-500">{r.rank ?? "–"}</span>
      <div className="min-w-0">
        <div className="truncate">{name}</div>
        <div className="text-xs tabular-nums text-slate-500">
          {dkn(r.positive)} af {dkn(r.scanned)} boliger
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 sm:hidden">
          <div className={`h-full rounded-full ${r.positive ? "bg-emerald-500" : "bg-slate-300"}`} style={{ width: `${w * 100}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-slate-100 sm:block">
          <div className={`h-full rounded-full ${r.positive ? "bg-emerald-500" : "bg-slate-300"}`} style={{ width: `${w * 100}%` }} />
        </div>
        <span className={`ml-auto text-sm font-semibold tabular-nums ${r.positive ? "text-slate-900" : "text-slate-400"}`}>{pct(r.share)} %</span>
      </div>
      <span className="hidden text-right text-sm tabular-nums text-slate-600 sm:block">{r.medianM2 ? `${dkn(r.medianM2)} kr./m²` : "–"}</span>
      <span className="hidden text-right sm:block">{showMove ? <Move now={r.rank} before={before} /> : <span className="text-slate-300">–</span>}</span>
    </li>
  );
}

export default async function UdlejerindeksPage() {
  const idx = await getUdlejerindeks();
  const prev = idx ? await previousReading(monthKey()) : null;
  const prevRank = new Map(prev?.rows.map((r) => [r.slug, r.rank]) ?? []);
  const ranked = idx?.rows.filter((r) => r.rank != null) ?? [];
  const small = idx?.rows.filter((r) => r.rank == null) ?? [];
  const top = ranked[0];
  const nat = idx ? idx.positive / idx.scanned : 0;
  const max = top?.share ?? 1;
  const zeroNames = ranked.filter((r) => r.positive === 0).map((r) => r.name);
  const when = idx ? dateDa(idx.updated) : "";

  const jsonLd = idx && {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "NordInvest Udlejerindeks",
    description: DESCRIPTION,
    url: `${site.url}/udlejerindeks`,
    creator: { "@type": "Organization", name: "NordInvest", url: site.url },
    license: `${site.url}/presse`,
    isAccessibleForFree: true,
    dateModified: idx.updated,
    spatialCoverage: { "@type": "Place", name: "Danmark" },
    variableMeasured: "Andel af helårsboliger til salg med positivt cashflow som udlejning",
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Nav />
      <main>
        <section className="bg-[#0a0e16] px-4 pb-10 pt-8 text-white sm:px-6 sm:pb-14 sm:pt-14">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-medium text-blue-300">NordInvest Udlejerindeks · {when}</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-[-0.028em] [text-wrap:balance] sm:text-5xl">
              Hvor kan lejen stadig betale lånet?
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
              Alle danske kommuner rangeret efter, hvor stor en andel af helårsboligerne til salg der giver plus som
              udlejning efter lån og alle udgifter. Regnet på hver eneste bolig og opdateret hver 6. time.
            </p>
            {idx && top && (
              <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-4">
                {[
                  ["Boliger med plus", `${dkn(idx.positive)}`, `af ${dkn(idx.scanned)} til salg`],
                  ["Andel i hele landet", `${pct(nat)} %`, "helårsboliger"],
                  ["Nr. 1 lige nu", top.name, `${pct(top.share)} % giver plus`],
                  ["Kommuner uden én", `${idx.zero}`, "bolig, der giver plus"],
                ].map(([k, v, s]) => (
                  <div key={k} className="bg-[#0f1522] p-4 sm:p-5">
                    <dt className="text-xs text-slate-400">{k}</dt>
                    <dd className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl">{v}</dd>
                    <dd className="text-xs text-slate-400">{s}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        <section aria-labelledby="rank-h" className="px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-5xl">
            <h2 id="rank-h" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Alle {ranked.length} kommuner
            </h2>
            <p className="mt-2 max-w-3xl leading-relaxed text-slate-600">
              Kommuner med mindst {MIN_SCANNED} helårsboliger til salg er med. Har to kommuner samme andel, deler de pladsen.
              {prev ? ` Pilene viser ændringen siden målingen i ${prev.month}.` : " Første officielle måling gemmes den 1. i måneden; derefter viser pilene, hvem der går frem og tilbage."}
            </p>
            {!idx ? (
              <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Indekset kunne ikke beregnes lige nu. Prøv igen om lidt.
              </p>
            ) : (
              <>
                <div className="mt-6 hidden grid-cols-[3rem_minmax(0,1fr)_14rem_8rem_4rem] gap-x-5 px-5 text-xs font-medium text-slate-500 sm:grid">
                  <span>Plads</span>
                  <span>Kommune</span>
                  <span className="text-right">Andel med plus</span>
                  <span className="text-right">Median m²-pris</span>
                  <span className="text-right">Siden sidst</span>
                </div>
                <ol className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
                  {ranked.map((r) => (
                    <Row key={r.slug} r={r} before={prev ? (prevRank.has(r.slug) ? prevRank.get(r.slug) : undefined) : undefined} showMove={!!prev} max={max} />
                  ))}
                </ol>
                {small.length > 0 && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-500">
                    For få boliger til salg til at blive rangeret: {small.map((r) => `${r.name} (${r.positive} af ${r.scanned})`).join(", ")}.
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {idx && top && (
          <section aria-labelledby="press-h" className="border-t border-slate-200 bg-[#f4f6f9] px-4 py-10 sm:px-6 sm:py-14">
            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
              <div>
                <h2 id="press-h" className="text-2xl font-semibold tracking-[-0.02em]">Til journalister</h2>
                <p className="mt-3 leading-relaxed text-slate-600">
                  Tallene må frit bruges med kilden <b>NordInvest Udlejerindeks</b>. Vi regner gerne en konkret kommune eller bolig
                  igennem for jer, og stifteren stiller op til interview.
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  Kontakt: Nikolaj Blond · <a className="font-medium text-blue-700 underline underline-offset-2" href="mailto:contact@nordinvest.io">contact@nordinvest.io</a> ·{" "}
                  <Link className="font-medium text-blue-700 underline underline-offset-2" href="/presse">Pressemateriale</Link> ·{" "}
                  <Link className="font-medium text-blue-700 underline underline-offset-2" href="/widget">Gratis widget til jeres side</Link>
                </p>
              </div>
              <figure className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <figcaption className="text-xs font-medium text-slate-500">Citat, klar til brug</figcaption>
                <blockquote className="mt-2 leading-relaxed text-slate-800">
                  Ifølge NordInvest Udlejerindeks giver {dkn(idx.positive)} af {dkn(idx.scanned)} helårsboliger til salg i Danmark
                  positivt cashflow som udlejning ({pct(nat)} %). {top.name} ligger nr. 1, hvor {pct(top.share)} % af boligerne giver plus,
                  mens ikke én bolig til salg gør det i {idx.zero} kommuner{zeroNames.length ? `, blandt andre ${zeroNames.slice(0, 3).join(", ")}` : ""}. Opgjort {when}.
                </blockquote>
              </figure>
            </div>
          </section>
        )}

        <section aria-labelledby="method-h" className="px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl">
            <h2 id="method-h" className="text-2xl font-semibold tracking-[-0.02em]">Sådan regner vi</h2>
            <p className="mt-3 leading-relaxed text-slate-600">
              Indekset bygger på alle ejerlejligheder, villaer og rækkehuse til salg på Boligsiden. For hver bolig anslår vi
              markedslejen ud fra areal og område og trækker ydelsen på et lån med 20 % udbetaling og 5 % rente samt
              ejerudgifterne fra. Giver det et overskud hver måned, tæller boligen som en bolig med plus. Sommerhuse og
              landbrug er ikke med, fordi de ikke kan lejes ud hele året. Indekset viser, hvor markedet regner som
              udlejning, ikke om en enkelt bolig er en god handel; det afgør{" "}
              <Link href="/analyseren" className="font-medium text-blue-700 underline underline-offset-2">den fulde analyse</Link>.
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              Vil du se boligerne bag tallene, finder du dem i{" "}
              <Link href="/deals" className="font-medium text-blue-700 underline underline-offset-2">Deal-motoren</Link>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </div>
  );
}
