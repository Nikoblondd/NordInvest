import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { getAllPosts, getPost, getRelatedPosts, formatDateDa } from "@/lib/blog";
import { site } from "@/lib/site";

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
  return {
    title: post.meta.title,
    description: post.meta.description,
    openGraph: {
      title: post.meta.title,
      description: post.meta.description,
      images: post.meta.image ? [post.meta.image] : undefined,
      type: "article",
    },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post || post.meta.lang === "en") notFound();
  const { meta, html } = post;
  const related = getRelatedPosts(meta.slug, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: meta.title,
        description: meta.description,
        datePublished: meta.date,
        dateModified: meta.date,
        author: { "@id": `${site.url}/#organization`, "@type": "Organization", name: meta.author },
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
          <div className="article" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="mt-14 rounded-2xl border border-stone-200 bg-navy-900 p-8 text-cream-100">
            <h3 className="text-xl text-cream-100">Regn på din egen bolig</h3>
            <p className="mt-2 text-cream-100/70">
              Indsæt tallene og få en klar dom på under 60 sekunder.
            </p>
            <Button href="/analyseren" className="mt-5">
              Åbn Analyseren →
            </Button>
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
