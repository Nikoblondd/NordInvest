import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { TERMS, term as getTerm } from "@/lib/terms";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return TERMS.map((t) => ({ term: t.slug }));
}

export function generateMetadata({ params }: { params: { term: string } }): Metadata {
  const t = getTerm(params.term);
  if (!t) return {};
  const desc = t.definition.length > 158 ? t.definition.slice(0, 155).replace(/\s+\S*$/, "") + "…" : t.definition;
  return {
    // Keep the search title under ~60 characters: long questions use the term instead.
    title: [`${t.question.replace(/\?$/, "")}: forklaring og eksempel`, `${t.question.replace(/\?$/, "")}? Forklaring`, `${t.term}: forklaring og eksempel`, `${t.term}: hvad er det?`].find((x) => x.length <= 47) ?? t.term,
    description: desc,
    alternates: { canonical: `/ordbog/${t.slug}` },
  };
}

export default function TermPage({ params }: { params: { term: string } }) {
  const t = getTerm(params.term);
  if (!t) notFound();
  const related = t.related.map(getTerm).filter((x): x is NonNullable<typeof x> => !!x);
  const url = `${site.url}/ordbog/${t.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DefinedTerm",
        "@id": `${url}#term`,
        name: t.term,
        ...(t.aka ? { alternateName: t.aka } : {}),
        description: t.definition,
        url,
        inDefinedTermSet: { "@type": "DefinedTermSet", name: "NordInvests ordbog om ejendomsinvestering", url: `${site.url}/ordbog` },
      },
      {
        "@type": "FAQPage",
        mainEntity: [{ "@type": "Question", name: t.question, acceptedAnswer: { "@type": "Answer", text: t.definition } }],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Forside", item: site.url },
          { "@type": "ListItem", position: 2, name: "Ordbog", item: `${site.url}/ordbog` },
          { "@type": "ListItem", position: 3, name: t.term, item: url },
        ],
      },
    ],
  };
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <article className="mx-auto max-w-2xl px-4 pb-20 pt-28 sm:px-6">
        <nav aria-label="Brødkrumme" className="text-sm text-slate-500">
          <Link href="/ordbog" className="hover:text-slate-900 hover:underline">Ordbog</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="font-medium text-slate-700">{t.term}</span>
        </nav>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance] sm:text-[44px]">{t.question}</h1>
        {t.aka && <p className="mt-2 text-[15px] text-slate-500">Også kaldet {t.aka.join(", ")}.</p>}
        <p className="mt-6 text-[19px] leading-relaxed text-slate-800">{t.definition}</p>

        {t.formula && (
          <section className="mt-10">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Formel</h2>
            <p className="mt-3 rounded-xl bg-slate-900 px-4 py-3 font-mono text-[14px] text-slate-100">{t.formula}</p>
          </section>
        )}
        {t.example && (
          <section className="mt-10">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Eksempel</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-slate-700">{t.example}</p>
          </section>
        )}
        <section className="mt-10">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Hvorfor det betyder noget, når du køber til udlejning</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-slate-700">{t.use}</p>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          {t.links.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                i === 0
                  ? "inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-[15px] font-semibold text-white hover:bg-blue-700"
                  : "inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-5 text-[15px] font-semibold text-slate-800 hover:bg-slate-50"
              }
            >
              {l.label} {i === 0 && <ArrowRight aria-hidden size={16} />}
            </Link>
          ))}
        </div>

        {related.length > 0 && (
          <section className="mt-14 border-t border-slate-200 pt-8">
            <h2 className="text-[18px] font-semibold">Relaterede begreber</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/ordbog/${r.slug}`} className="inline-flex rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:border-slate-300">
                    {r.term}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
      <Footer />
    </main>
  );
}
