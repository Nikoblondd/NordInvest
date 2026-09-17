"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X } from "lucide-react";
import type { SearchablePost } from "@/lib/blog";

// Inlined (client-safe) — importing it from @/lib/blog would pull `node:fs` into
// the client bundle, which Next refuses to bundle.
function formatDateDa(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
}

type Sort = "nyeste" | "aeldste" | "relevans";

const SORTS: { id: Sort; label: string }[] = [
  { id: "nyeste", label: "Nyeste først" },
  { id: "aeldste", label: "Ældste først" },
  { id: "relevans", label: "Mest relevante" },
];

export function BlogBrowser({ posts }: { posts: SearchablePost[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("nyeste");

  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const searching = tokens.length > 0;

  const filtered = useMemo(() => {
    // Match every search token anywhere in the post (title, description, tags OR
    // body) — so any word or partial word the user types finds the article.
    const list = searching ? posts.filter((p) => tokens.every((t) => p.text.includes(t))) : posts;

    const relevance = (p: SearchablePost) => {
      let s = 0;
      for (const t of tokens) {
        if (p.title.toLowerCase().includes(t)) s += 100;
        if (p.description.toLowerCase().includes(t)) s += 20;
        s += p.text.split(t).length - 1; // number of occurrences in the whole text
      }
      return s;
    };

    const arr = [...list];
    if (sort === "aeldste") arr.sort((a, b) => a.date.localeCompare(b.date));
    else if (sort === "relevans" && searching) arr.sort((a, b) => relevance(b) - relevance(a));
    else arr.sort((a, b) => b.date.localeCompare(a.date));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, q, sort]);

  // A featured hero only makes sense for the default "newest, no search" view.
  const showFeatured = !searching && sort === "nyeste";
  const featured = showFeatured ? filtered[0] : null;
  const grid = showFeatured ? filtered.slice(1) : filtered;

  return (
    <div>
      {/* toolbar: search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg i alle artikler — fx rente, København, cash flow…"
            aria-label="Søg i artikler"
            className="w-full rounded-full border border-stone-200 bg-white py-3 pl-11 pr-10 text-[15px] outline-none transition-colors focus:border-navy-900"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Ryd søgning"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:text-stone-700"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="blog-sort" className="text-sm text-stone-500">Sortér:</label>
          <select
            id="blog-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-navy-900"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {searching && (
        <p className="mt-4 text-sm text-stone-500">
          {filtered.length === 0
            ? `Ingen artikler matchede “${query}”.`
            : `${filtered.length} ${filtered.length === 1 ? "artikel" : "artikler"} matcher “${query}”.`}
        </p>
      )}

      {/* featured hero */}
      {featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="group mt-8 grid gap-8 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-xl md:grid-cols-2"
        >
          {featured.image && (
            <div className="relative h-64 w-full overflow-hidden md:h-full md:max-h-80">
              <Image
                src={featured.image}
                alt={featured.title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                priority
                className="object-cover"
              />
            </div>
          )}
          <div className="p-8 md:p-10">
            <span className="micro text-gold-600">★ Nyeste</span>
            <h2 className="mt-3 text-2xl group-hover:text-navy-900 md:text-3xl">{featured.title}</h2>
            <p className="mt-3 text-stone-600">{featured.description}</p>
            <div className="mt-5 text-sm text-stone-400">
              {formatDateDa(featured.date)} · {featured.readingMinutes} min. læsning
            </div>
          </div>
        </Link>
      )}

      {/* grid */}
      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {grid.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-xl"
          >
            {p.image && (
              <div className="relative h-44 w-full overflow-hidden">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  loading="lazy"
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex flex-1 flex-col p-6">
              <h3 className="text-lg leading-snug group-hover:text-navy-900">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm text-stone-600 line-clamp-3">{p.description}</p>
              <div className="mt-4 text-xs text-stone-400">
                {formatDateDa(p.date)} · {p.readingMinutes} min.
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
