import Image from "next/image";
import Link from "next/link";
import type { DealSnapshot, SnapshotDeal, SnapshotInvestment } from "@/lib/deals-snapshot";
import { DEAL_CITIES } from "@/lib/deal-cities";
import { site } from "@/lib/site";

/*
 * The server-rendered half of the Deal-motor pages: the current rankings, how
 * the engine works, what the score means and the FAQ. The interactive finder
 * above it is client-side; this part is what search engines and AI assistants
 * read, so every number here comes from the same engine.
 */

export const TYPE_LABEL: Record<string, string> = {
  condo: "Ejerlejlighed",
  villa: "Villa",
  "terraced house": "Rækkehus",
  cooperative: "Andelsbolig",
};

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;
const signedKr = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n)).toLocaleString("da-DK")} kr./md.`;
export const dateDa = (iso: string) =>
  new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" }).format(new Date(iso));

function Score({ score }: { score: number }) {
  const tone = score >= 65 ? "text-emerald-700 bg-emerald-50 ring-emerald-200" : score >= 45 ? "text-blue-700 bg-blue-50 ring-blue-200" : "text-slate-600 bg-slate-50 ring-slate-200";
  return (
    <span className={`inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-lg px-2 text-sm font-semibold tabular-nums ring-1 ring-inset ${tone}`}>
      <span className="sr-only">Score </span>
      {score}
    </span>
  );
}

// Listing photos are full-size originals (often 100 KB+). Hosts that next.config
// allows go through the image optimizer at thumbnail size; anything else falls
// back to a plain lazy <img>.
const OPTIMIZABLE = /(^|\.)(boligsiden|ejendomstorvet|edc|home|danbolig|nybolig|estate)\.dk$/;
const optimizable = (src: string) => {
  try {
    const u = new URL(src);
    return u.protocol === "https:" && OPTIMIZABLE.test(u.hostname);
  } catch {
    return false;
  }
};

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  const cls = "h-[54px] w-[72px] shrink-0 rounded-lg object-cover ring-1 ring-slate-200 sm:h-[72px] sm:w-[96px]";
  if (src && optimizable(src)) {
    return <Image src={src} alt={alt} width={96} height={72} sizes="(min-width: 640px) 96px, 72px" quality={70} className={cls} />;
  }
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={96} height={72} loading="lazy" decoding="async" className={cls} />
  ) : (
    <span aria-hidden className="h-[54px] w-[72px] shrink-0 rounded-lg bg-slate-100 ring-1 ring-slate-200 sm:h-[72px] sm:w-[96px]" />
  );
}

export function DealRanking({ deals }: { deals: SnapshotDeal[] }) {
  return (
    <ol className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {deals.map((d, i) => {
        const type = TYPE_LABEL[d.type] ?? "Bolig";
        return (
          <li key={d.href}>
            <Link
              href={d.href}
              className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 p-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:grid-cols-[2rem_auto_minmax(0,1fr)_8rem_9rem_3.5rem] sm:gap-x-5 sm:p-4"
            >
              <span className="w-5 text-right text-sm font-semibold tabular-nums text-slate-400 sm:w-8">{i + 1}</span>
              <Thumb src={d.image} alt={`${type}, ${d.address}`} />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold text-slate-900">{d.address.split(",")[0]}</span>
                <span className="mt-0.5 block truncate text-sm text-slate-500">
                  {d.zip} {d.city} · {type}
                  {d.area ? ` · ${d.area} m²` : ""}
                </span>
                <span className="mt-0.5 flex flex-wrap gap-x-2 text-sm tabular-nums text-slate-700 sm:hidden">
                  <span className="whitespace-nowrap">{kr(d.price)}</span>
                  <span className={`whitespace-nowrap ${d.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{signedKr(d.cashFlow)}</span>
                </span>
              </span>
              <span className="hidden text-right text-sm tabular-nums text-slate-700 sm:block">
                <span className="block text-xs text-slate-400">Pris</span>
                {kr(d.price)}
              </span>
              <span className="hidden text-right text-sm tabular-nums sm:block">
                <span className="block text-xs text-slate-400">Cashflow</span>
                <span className={d.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600"}>{signedKr(d.cashFlow)}</span>
              </span>
              <span className="text-right">
                <span className="hidden text-xs text-slate-400 sm:block">Score</span>
                <Score score={d.score} />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function InvestmentRanking({ deals }: { deals: SnapshotInvestment[] }) {
  return (
    <ol className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {deals.map((d, i) => (
        <li key={d.href}>
          <Link
            href={d.href}
            className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 p-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:grid-cols-[2rem_auto_minmax(0,1fr)_8rem_9rem_3.5rem] sm:gap-x-5 sm:p-4"
          >
            <span className="w-5 text-right text-sm font-semibold tabular-nums text-slate-400 sm:w-8">{i + 1}</span>
            <Thumb src={d.image} alt={`Erhvervsejendom, ${d.address}`} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-slate-900">{d.address || d.title}</span>
              <span className="mt-0.5 block truncate text-sm text-slate-500">
                {d.zip} {d.city}
                {d.subcategory ? ` · ${d.subcategory}` : ""}
              </span>
              <span className="mt-0.5 flex flex-wrap gap-x-2 text-sm tabular-nums text-slate-700 sm:hidden">
                <span className="whitespace-nowrap">{kr(d.price)}</span>
                <span className="whitespace-nowrap">afkast {pct(d.capRate)}</span>
              </span>
            </span>
            <span className="hidden text-right text-sm tabular-nums text-slate-700 sm:block">
              <span className="block text-xs text-slate-400">Pris</span>
              {kr(d.price)}
            </span>
            <span className="hidden text-right text-sm tabular-nums text-slate-700 sm:block">
              <span className="block text-xs text-slate-400">Afkast</span>
              {pct(d.capRate)}
            </span>
            <span className="text-right">
              <span className="hidden text-xs text-slate-400 sm:block">Score</span>
              <Score score={d.score} />
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Key figures for the scanned market, in a hairline-divided strip. */
export function MarketFigures({ snap, where }: { snap: DealSnapshot; where: string }) {
  const share = snap.scanned ? Math.round((snap.positive / snap.scanned) * 100) : 0;
  const items = [
    { label: `Helårsboliger til salg ${where}`, value: snap.scanned.toLocaleString("da-DK") },
    // 3 of 1.173 rounds to "0 %", which reads as none; say "under 1 %" instead.
    { label: "Med positivt cashflow", value: `${snap.positive.toLocaleString("da-DK")} (${snap.positive > 0 && share < 1 ? "under 1" : share}\u00a0%)` },
    { label: "Median kvadratmeterpris", value: snap.medianPricePerM2 ? `${Math.round(snap.medianPricePerM2).toLocaleString("da-DK")} kr./m²` : "–" },
    { label: "Median bruttoafkast", value: snap.medianGrossYield != null ? pct(snap.medianGrossYield) : "–" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="bg-white p-4 sm:p-5">
          <dt className="text-sm text-slate-500">{it.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em] text-slate-900 sm:text-2xl">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Assumptions({ updated }: { updated: string }) {
  return (
    <p className="mt-3 text-sm text-slate-500">
      Opdateret {dateDa(updated)}. Beregnet med 20 % udbetaling og 5 % rente (erhverv: 30 % udbetaling). Lejen er et
      estimat ud fra området; åbn analysen for at se og rette tallene.
    </p>
  );
}

const STEPS = [
  {
    h: "Scanner hele markedet",
    p: "Deal-motoren henter boliger til salg fra de store mæglerkæder (EDC, home, Nybolig, Danbolig m.fl.) via Boligsiden og erhvervsejendomme fra Ejendomstorvet. Listen holdes opdateret løbende, og solgte boliger fjernes.",
  },
  {
    h: "Anslår lejen",
    p: "For hver bolig beregnes en forventet markedsleje ud fra boligens areal og en lejesats pr. m² for området, fra ca. 88 kr. i provinsen til 175 kr. i indre København. Satsen justeres efter faktiske handler i regionen.",
  },
  {
    h: "Regner økonomien igennem",
    p: "Prisen finansieres med 20 % udbetaling og 5 % rente. Ejerudgiften trækkes fra (eller anslås til 35 kr. pr. m² om måneden), og resultatet er cashflow pr. måned, bruttoafkast, nettoafkast og kontantafkast.",
  },
  {
    h: "Scorer og rangerer",
    p: "Afkast, cashflow, gældsdækning (DSCR) og det forventede afkast over ejertiden samles i én score fra 0 til 100. Boligerne sorteres efter scoren, så de stærkeste handler står øverst.",
  },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2">
      {STEPS.map((s, i) => (
        <li key={s.h} className="bg-white p-5 sm:p-6">
          <span className="text-sm font-semibold tabular-nums text-blue-600">Trin {i + 1}</span>
          <h3 className="mt-1 text-lg font-semibold tracking-[-0.01em] text-slate-900">{s.h}</h3>
          <p className="mt-2 leading-relaxed text-slate-600">{s.p}</p>
        </li>
      ))}
    </ol>
  );
}

const BANDS = [
  { range: "80–100", label: "Fremragende", text: "Stærkt afkast og cashflow med god margin til rentestigninger." },
  { range: "65–79", label: "Solid", text: "Handlen hænger sammen. Tjek lejen og vedligeholdet, før du byder." },
  { range: "45–64", label: "Middel", text: "Tallene hænger, men marginen er tynd. Kør følsomhedsscenarierne." },
  { range: "0–44", label: "Svag", text: "Afkast og gældsdækning bærer ikke handlen til den pris." },
];

export function ScoreBands() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left text-[15px]">
        <thead className="bg-slate-50 text-sm text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium sm:px-5">Score</th>
            <th scope="col" className="px-4 py-3 font-medium sm:px-5">Vurdering</th>
            <th scope="col" className="px-4 py-3 font-medium sm:px-5">Hvad det betyder</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {BANDS.map((b) => (
            <tr key={b.range}>
              <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-slate-900 sm:px-5">{b.range}</td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 sm:px-5">{b.label}</td>
              <td className="px-4 py-3 text-slate-600 sm:px-5">{b.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CityLinks({ current }: { current?: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {DEAL_CITIES.filter((c) => c.slug !== current).map((c) => (
        <li key={c.slug}>
          <Link
            href={`/deals/${c.slug}`}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            Bedste handler {c.in}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {items.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-4 text-base font-semibold text-slate-900 sm:text-[17px] [&::-webkit-details-marker]:hidden">
            {f.q}
            <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-transform duration-300 group-open:rotate-45 group-open:text-blue-600">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 1 v10 M1 6 h10" />
              </svg>
            </span>
          </summary>
          <p className="max-w-3xl pb-5 pr-10 leading-relaxed text-slate-600">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Structured data: the tool itself, its current ranking, breadcrumbs and FAQ. */
export function dealsJsonLd({
  path,
  name,
  description,
  snap,
  faq,
  crumbs,
}: {
  path: string;
  name: string;
  description: string;
  snap: DealSnapshot | null;
  faq: { q: string; a: string }[];
  crumbs: { name: string; path: string }[];
}) {
  const url = `${site.url}${path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${site.url}/deals#app`,
        name: "NordInvest Deal-motor",
        url: `${site.url}/deals`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: "da-DK",
        description:
          "Søger hele det danske boligmarked og rangerer boliger og erhvervsejendomme efter cashflow, afkast og en investeringsscore fra 0 til 100.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
        publisher: { "@id": `${site.url}/#organization` },
      },
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name,
        description,
        inLanguage: "da-DK",
        isPartOf: { "@id": `${site.url}/#website` },
        about: { "@id": `${site.url}/deals#app` },
        ...(snap ? { dateModified: snap.updated } : {}),
        ...(snap && snap.top.length
          ? {
              mainEntity: {
                "@type": "ItemList",
                name,
                numberOfItems: snap.top.length,
                itemListOrder: "https://schema.org/ItemListOrderDescending",
                itemListElement: snap.top.map((d, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: `${TYPE_LABEL[d.type] ?? "Bolig"}, ${d.address}`,
                  url: `${site.url}${d.href}`,
                })),
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: `${site.url}${c.path}` })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };
}
