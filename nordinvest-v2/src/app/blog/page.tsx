import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAllPosts, formatDateDa } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Guides til ejendomsinvestering",
  description:
    "Guides, analyser og strategier for danske ejendomsinvestorer. Afkast, cash flow, finansiering, BRRRR og de bedste byer at investere i.",
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const [featured, ...rest] = posts;

  return (
    <main>
      <Nav />
      <section className="bg-cream-50 pt-32">
        <div className="container-x pb-10">
          <p className="micro text-gold-600">Blog</p>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-6xl">
            Guides til dansk ejendomsinvestering.
          </h1>
        </div>
      </section>

      <section className="bg-cream-50 pb-24">
        <div className="container-x">
          {featured && (
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid gap-8 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-xl md:grid-cols-2"
            >
              {featured.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="h-full max-h-80 w-full object-cover"
                />
              )}
              <div className="p-8 md:p-10">
                <span className="micro text-gold-600">★ Nyeste</span>
                <h2 className="mt-3 text-2xl md:text-3xl group-hover:text-navy-900">
                  {featured.title}
                </h2>
                <p className="mt-3 text-stone-600">{featured.description}</p>
                <div className="mt-5 text-sm text-stone-400">
                  {formatDateDa(featured.date)} · {featured.readingMinutes} min. læsning
                </div>
              </div>
            </Link>
          )}

          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-xl"
              >
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.title}
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg leading-snug group-hover:text-navy-900">
                    {p.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-stone-600 line-clamp-3">
                    {p.description}
                  </p>
                  <div className="mt-4 text-xs text-stone-400">
                    {formatDateDa(p.date)} · {p.readingMinutes} min.
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
