import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getSearchablePosts } from "@/lib/blog";
import { BlogBrowser } from "@/components/blog/BlogBrowser";

export const metadata: Metadata = {
  title: "Blog — Guides til ejendomsinvestering",
  description:
    "Guides, analyser og strategier for danske ejendomsinvestorer. Afkast, cash flow, finansiering, BRRRR og de bedste byer at investere i.",
};

export default function BlogIndex() {
  const posts = getSearchablePosts();

  return (
    <main>
      <Nav />
      <section className="bg-cream-50 pt-32">
        <div className="container-x pb-10">
          <p className="micro text-gold-600">Blog</p>
          <h1 className="mt-4 max-w-3xl text-4xl md:text-6xl">
            Guides til dansk ejendomsinvestering.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">
            Søg og sortér i alle vores artikler — nyheder, analyser og strategier for danske ejendomsinvestorer.
          </p>
        </div>
      </section>

      <section className="bg-cream-50 pb-24">
        <div className="container-x">
          <BlogBrowser posts={posts} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
