import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { geist } from "@/components/home/fonts";
import { formatDateDa, type PostMeta } from "@/lib/blog";
import type { FaqItem, FeatureExtras, TocItem } from "@/lib/blog-feature";
import { site } from "@/lib/site";

/**
 * The editorial template for feature articles. One typeface (Geist), one
 * accent (blue-600), hairlines instead of boxes. The page is a reading
 * experience: photo and headline, the three numbers that matter, a table of
 * contents that stays beside the text, and one clear next step at the end.
 */
export function FeatureArticle({
  meta,
  extras,
  html,
  toc,
  faq,
  related,
}: {
  meta: PostMeta;
  extras: FeatureExtras;
  html: string;
  toc: TocItem[];
  faq: FaqItem[];
  related: PostMeta[];
}) {
  const url = `${site.url}/blog/${meta.slug}`;
  const image = meta.image?.startsWith("/") ? `${site.url}${meta.image}` : meta.image;
  const updated = extras.updated ?? meta.date;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: meta.title,
        description: meta.description,
        datePublished: meta.date,
        dateModified: updated,
        author: { "@type": "Organization", "@id": `${site.url}/#organization`, name: "NordInvest", url: site.url },
        publisher: {
          "@type": "Organization",
          "@id": `${site.url}/#organization`,
          name: "NordInvest",
          logo: { "@type": "ImageObject", url: `${site.url}/nordinvest-logo.png` },
        },
        image: image ? [{ "@type": "ImageObject", url: image, width: 1680, height: 944 }] : undefined,
        inLanguage: "da-DK",
        mainEntityOfPage: url,
        articleSection: extras.category,
        keywords: meta.tags.join(", "),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Forside", item: site.url },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog` },
          { "@type": "ListItem", position: 3, name: meta.title, item: url },
        ],
      },
      ...(faq.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
    ],
  };

  const tocItems = toc.filter((t) => t.text !== "Kilder");

  return (
    <div className={`${geist.variable} min-h-[100dvh] bg-white font-geist text-slate-900 antialiased`}>
      <Nav />
      <main>
        <article itemScope itemType="https://schema.org/Article">
          {/* Headline and photo */}
          <header className="px-4 pb-10 pt-8 sm:px-6 sm:pb-14 lg:pt-14">
            <div className="mx-auto grid max-w-[1104px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-14">
              <div className="min-w-0">
                <nav aria-label="Brødkrummer" className="text-[15px] text-slate-500">
                  <Link href="/blog" className="hover:text-slate-900 hover:underline">
                    Blog
                  </Link>
                  <span aria-hidden className="mx-2 text-slate-300">/</span>
                  <span className="font-medium text-blue-700">{extras.category}</span>
                </nav>
                <h1
                  itemProp="headline"
                  className="mt-4 text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] [text-wrap:balance] sm:text-[46px] lg:text-[50px]"
                >
                  {meta.title}
                </h1>
                <p itemProp="description" className="mt-5 max-w-xl text-[19px] leading-relaxed text-slate-600">
                  {meta.description}
                </p>
                <p className="mt-6 text-[15px] text-slate-500">
                  Opdateret <time dateTime={updated} itemProp="dateModified">{formatDateDa(updated)}</time>
                  <span className="mx-2 text-slate-300" aria-hidden>/</span>
                  {meta.readingMinutes} min. læsning
                  <meta itemProp="datePublished" content={meta.date} />
                </p>
              </div>
              {meta.image && (
                <figure className="m-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meta.image}
                    alt={extras.imageAlt ?? meta.title}
                    width={1680}
                    height={944}
                    fetchPriority="high"
                    itemProp="image"
                    className="aspect-[4/3] w-full rounded-2xl object-cover shadow-[0_24px_50px_-24px_rgba(15,23,42,0.45)] sm:aspect-[16/10]"
                  />
                </figure>
              )}
            </div>
          </header>

          {/* The three numbers the article is about */}
          {extras.facts.length > 0 && (
            <section aria-label="Kort fortalt" className="border-y border-slate-200/80 bg-[#f4f6f9] px-4 py-8 sm:px-6 sm:py-10">
              <dl className="mx-auto grid max-w-[1104px] gap-y-6 sm:grid-cols-3 sm:gap-y-0">
                {extras.facts.map((f, i) => (
                  <div key={f.value} className={i > 0 ? "border-t border-slate-200 pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0" : "sm:pr-8"}>
                    <dt className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-slate-900 tabular-nums sm:text-[34px]">
                      {f.value}
                    </dt>
                    <dd className="mt-2.5 max-w-xs text-[15px] leading-snug text-slate-600">{f.label}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Body with a table of contents beside it */}
          <div className="px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto grid max-w-[1104px] gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
              <aside className="hidden lg:block">
                <nav aria-label="På denne side" className="sticky top-24">
                  <p className="text-[13px] font-semibold text-slate-900">På denne side</p>
                  <ol className="mt-3 space-y-0.5 border-l border-slate-200">
                    {tocItems.map((t) => (
                      <li key={t.id}>
                        <a
                          href={`#${t.id}`}
                          className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[14px] leading-snug text-slate-500 transition-colors hover:border-slate-900 hover:text-slate-900"
                        >
                          {t.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </aside>

              <div className="min-w-0">
                <details className="mb-10 rounded-2xl border border-slate-200 lg:hidden">
                  <summary className="cursor-pointer select-none px-5 py-4 text-[15px] font-semibold text-slate-900">
                    På denne side
                  </summary>
                  <ol className="space-y-1 px-5 pb-5">
                    {tocItems.map((t) => (
                      <li key={t.id}>
                        <a href={`#${t.id}`} className="block py-1 text-[15px] text-slate-600 hover:text-slate-900">
                          {t.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>
                <div itemProp="articleBody" className="feature-prose" dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </div>
          </div>

          {/* One next step */}
          <section aria-labelledby="cta-h" className="bg-[#0a0e16] px-4 py-14 text-white sm:px-6 sm:py-20">
            <div className="mx-auto grid max-w-[1104px] items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <h2 id="cta-h" className="max-w-2xl text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance] sm:text-[40px]">
                  Regn din egen bolig igennem.
                </h2>
                {extras.cta && <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/70">{extras.cta}</p>}
              </div>
              <Link
                href="/analyseren"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3.5 text-[16px] font-semibold text-white transition-[background-color,transform] hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6aa8ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e16] active:scale-[0.98]"
              >
                Åbn Analyseren
              </Link>
            </div>
          </section>

          {related.length > 0 && (
            <section aria-labelledby="related-h" className="px-4 py-14 sm:px-6 sm:py-16">
              <div className="mx-auto max-w-[1104px]">
                <h2 id="related-h" className="text-[22px] font-semibold tracking-[-0.02em]">
                  Læs også
                </h2>
                <ul className="mt-6 grid gap-x-10 border-t border-slate-200 md:grid-cols-3">
                  {related.map((p) => (
                    <li key={p.slug} className="border-b border-slate-200 md:border-b-0">
                      <Link href={`/blog/${p.slug}`} className="group block py-5">
                        <span className="block text-[17px] font-semibold leading-snug text-slate-900 group-hover:text-blue-700">
                          {p.title}
                        </span>
                        <span className="mt-2 block text-sm text-slate-500">{p.readingMinutes} min. læsning</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </article>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
