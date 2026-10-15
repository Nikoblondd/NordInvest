import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAllPosts, getPost, getRelatedPosts, formatDateDa } from "@/lib/blog";
import { site } from "@/lib/site";
import { enhanceFeatureHtml, getFeatureExtras } from "@/lib/blog-feature";
import { FeatureArticle } from "@/components/blog/FeatureArticle";
import { BLOG_SEO } from "@/lib/blog-seo";
import { articleCity, splitBeforeH2 } from "@/lib/blog-cta";
import { AnalyzeInline } from "@/components/blog/AnalyzeInline";
import { ArticleEndCta } from "@/components/blog/ArticleEndCta";
import { StickyAnalyzeBar } from "@/components/blog/StickyAnalyzeBar";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "Indlæg ikke fundet" };
  const extras = getFeatureExtras(params.slug);
  const modified = extras?.updated ?? post.meta.date;
  // Full article metadata: Bing and Copilot lean on og:/article: tags and dates
  // more than Google does, so every post states them explicitly.
  // Shorter search title/description where the headline is too long for a result.
  const seo = BLOG_SEO[post.meta.slug] ?? {};
  const seoTitle = seo.title ?? post.meta.title;
  const seoDescription = seo.description ?? post.meta.description;
  return {
    title: seo.title ? { absolute: seo.title } : post.meta.title,
    description: seoDescription,
    keywords: post.meta.tags,
    alternates: { canonical: `/blog/${post.meta.slug}` },
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: `/blog/${post.meta.slug}`,
      images: post.meta.image ? [{ url: post.meta.image, width: 1680, height: 944, alt: extras?.imageAlt ?? post.meta.title }] : undefined,
      type: "article",
      locale: "da_DK",
      siteName: "NordInvest",
      publishedTime: post.meta.date,
      modifiedTime: modified,
      authors: ["NordInvest"],
      section: extras?.category,
      tags: post.meta.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
      images: post.meta.image ? [post.meta.image] : undefined,
    },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post || post.meta.lang === "en") notFound();
  const { meta, html } = post;
  const related = getRelatedPosts(meta.slug, 3);
  const city = articleCity(meta.title, meta.slug, meta.tags);

  const extras = getFeatureExtras(meta.slug);
  if (extras) {
    const enhanced = enhanceFeatureHtml(html);
    // Feature guides point to each other first, then to the closest older posts.
    const siblings = getAllPosts().filter((p) => p.slug !== meta.slug && getFeatureExtras(p.slug));
    const featureRelated = [...siblings, ...getRelatedPosts(meta.slug, 6).filter((p) => !siblings.some((x) => x.slug === p.slug))].slice(0, 3);
    return <FeatureArticle meta={meta} extras={extras} html={enhanced.html} toc={enhanced.toc} faq={enhanced.faq} related={featureRelated} city={city} />;
  }

  const parts = splitBeforeH2(html, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: meta.title,
        description: meta.description,
        datePublished: meta.date,
        dateModified: meta.date,
        author: { "@type": "Person", "@id": `${site.url}/om#nikolaj-blond`, name: site.founder.name, url: `${site.url}/om`, jobTitle: "Stifter af NordInvest", worksFor: { "@id": `${site.url}/#organization` } },
        publisher: {
          "@id": `${site.url}/#organization`,
          "@type": "Organization",
          name: "NordInvest",
          logo: { "@type": "ImageObject", url: `${site.url}/nordinvest-logo.png` },
        },
        image: meta.image,
        inLanguage: "da-DK",
        mainEntityOfPage: `${site.url}/blog/${meta.slug}`,
        articleSection: meta.tags?.[0] ?? "Ejendomsinvestering",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Forside", item: site.url },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog` },
          { "@type": "ListItem", position: 3, name: meta.title, item: `${site.url}/blog/${meta.slug}` },
        ],
      },
    ],
  };

  return (
    <main>
      <Nav />
      <article className="bg-cream-50 pt-28">
        <div className="container-x max-w-3xl pb-8">
          <Link href="/blog" className="text-sm text-gold-600 hover:text-gold-500">
            ← Alle indlæg
          </Link>
          <h1 className="mt-6 text-4xl leading-tight md:text-5xl">{meta.title}</h1>
          <div className="mt-4 text-sm text-stone-400">
            {formatDateDa(meta.date)} · {meta.readingMinutes} min. læsning ·{" "}
            {meta.author}
          </div>
        </div>

        {meta.image && (
          <div className="container-x max-w-4xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.image}
              alt={meta.title}
              className="max-h-[420px] w-full rounded-2xl border border-stone-200 object-cover"
            />
          </div>
        )}

        <div className="container-x max-w-3xl py-12">
          {parts ? (
            <>
              <div className="article" data-i18n-html dangerouslySetInnerHTML={{ __html: parts[0] }} />
              <div className="my-10">
                <AnalyzeInline
                  from={`blog_inline:${meta.slug}`}
                  title="Regn på en bolig, mens du læser"
                  sub="Sæt et link ind fra en boligside, så regner NordInvest cashflow, afkast og risici igennem for dig."
                />
              </div>
              <div className="article" data-i18n-html dangerouslySetInnerHTML={{ __html: parts[1] }} />
            </>
          ) : (
            <div className="article" data-i18n-html dangerouslySetInnerHTML={{ __html: html }} />
          )}

          <div className="mt-14">
            <ArticleEndCta id="blog-end-cta" slug={meta.slug} city={city} />
          </div>

          {related.length > 0 && (
            <div className="mt-14">
              <h2 className="text-xl text-stone-900">Læs også</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
                  >
                    {p.image && (
                      <div className="relative h-32 w-full overflow-hidden">
                        <Image
                          src={p.image}
                          alt={p.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, 100vw"
                          loading="lazy"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-base leading-snug text-stone-900 group-hover:text-navy-900">{p.title}</h3>
                      <div className="mt-3 text-xs text-stone-400">{formatDateDa(p.date)} · {p.readingMinutes} min.</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
      <Footer />
      <StickyAnalyzeBar slug={meta.slug} endId="blog-end-cta" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
