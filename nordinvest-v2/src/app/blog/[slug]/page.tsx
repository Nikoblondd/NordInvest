import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { getAllPosts, getPost, formatDateDa } from "@/lib/blog";
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
    author: { "@type": "Organization", name: meta.author },
    publisher: { "@type": "Organization", name: "NordInvest" },
    image: meta.image,
    inLanguage: "da-DK",
    mainEntityOfPage: `${site.url}/blog/${meta.slug}`,
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
