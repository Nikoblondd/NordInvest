import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnalyzeInline } from "@/components/blog/AnalyzeInline";
import { DEAL_CITIES, type DealCity } from "@/lib/deal-cities";

/**
 * The end of every article offers the two things a reader can do next: run
 * their own property through the analyser, or see which listings already give
 * a positive cash flow (their city first, when the article is about one).
 */
export function ArticleEndCta({ id, slug, city }: { id: string; slug: string; city: DealCity | null }) {
  const cities = city ? [city, ...DEAL_CITIES.filter((c) => c.slug !== city.slug).slice(0, 5)] : DEAL_CITIES.slice(0, 6);
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="rounded-3xl bg-[#0a0e16] p-6 text-white sm:p-10">
      <h2 id={`${id}-h`} className="max-w-xl text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] [text-wrap:balance] sm:text-[36px]">
        Fra teori til en rigtig bolig.
      </h2>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AnalyzeInline
          dark
          from={`blog_end:${slug}`}
          title="Har du en bolig i kikkerten?"
          sub="Sæt linket ind og få cashflow, afkast, risici og en klar dom på under et minut. Gratis at prøve."
        />
        <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-inset ring-white/10 sm:p-6">
          <p className="text-[17px] font-semibold tracking-[-0.01em]">
            {city ? `Hvilke boliger ${city.in} giver plus?` : "Hvilke boliger giver plus lige nu?"}
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-white/65">
            Deal-motoren regner alle helårsboliger til salg igennem og rangerer dem efter cashflow.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/deals/${c.slug}`}
                  className="inline-flex min-h-10 items-center rounded-full bg-white/10 px-3.5 text-[14px] font-medium text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6aa8ff]"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/deals" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#6aa8ff] hover:underline">
            Se hele Danmark <ArrowRight aria-hidden size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
