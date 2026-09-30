import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, TrendingUp, Database, BarChart3 } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { HeroInput } from "@/components/home/HeroInput";
import { CITIES, getCity, type City } from "@/lib/cities";

// City guides with a live Deal-motor ranking for the same market (/deals/<kommune>).
const DEALS_FOR: Record<string, { slug: string; in: string }> = {
  koebenhavn: { slug: "koebenhavn", in: "i København" },
  aarhus: { slug: "aarhus", in: "i Aarhus" },
  fyn: { slug: "odense", in: "i Odense" },
};

export function cityMetadata(slug: string): Metadata {
  const city = getCity(slug);
  if (!city) return {};
  const url = `https://nordinvest.io/investering-i-ejendom-${city.slug}`;
  return {
    title: city.title,
    description: city.description,
    alternates: { canonical: url },
    openGraph: { title: city.title, description: city.description, url, type: "article", images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "NordInvest: se hvad huset tjener, før du byder" }] },
  };
}

function Stat({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-blue-600">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <div className={small ? "mt-2 text-sm font-semibold text-slate-900" : "mt-2 text-2xl font-bold text-slate-900"}>{value}</div>
    </div>
  );
}

export function CityView({ slug }: { slug: string }) {
  const city = getCity(slug) as City;
  const url = `https://nordinvest.io/investering-i-ejendom-${city.slug}`;
  const others = CITIES.filter((c) => c.slug !== city.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: city.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "NordInvest", item: "https://nordinvest.io" },
          { "@type": "ListItem", position: 2, name: `Investering i ejendom ${city.inName}`, item: url },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />

      <section className="relative px-6 pb-16 pt-16 sm:pt-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-slate-50" />
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Investering i ejendom {city.inName}
          </p>
          <h1 className="mt-4 text-[2rem] font-bold leading-[1.12] tracking-tight [hyphens:auto] sm:text-5xl md:text-6xl">
            {city.h1}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">{city.intro}</p>
          <div className="mt-8">
            <HeroInput />
          </div>
        </div>
      </section>

      <section className="px-6">
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
          <Stat icon={<TrendingUp size={18} />} label="Typisk bruttoafkast" value={city.yield} />
          <Stat icon={<BarChart3 size={18} />} label="Markedsprofil" value={city.yieldLabel} small />
          <Stat icon={<Database size={18} />} label="Datakilde" value={city.dataSource} small />
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-12">
          {city.sections.map((s) => (
            <div key={s.h2}>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">{s.h2}</h2>
              <div className="mt-4 space-y-4 text-lg leading-relaxed text-slate-700">
                {s.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          ))}

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              FAQ — Investering i ejendom {city.inName}
            </h2>
            <div className="mt-6 space-y-4">
              {city.faq.map((f) => (
                <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="font-semibold text-slate-900">{f.q}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-8 text-white md:p-10">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Analysér en konkret bolig {city.inName}
            </h2>
            <p className="mt-3 max-w-xl text-slate-300">
              Indsæt et link fra Boligsiden eller EDC og få lejeafkast, cash flow, rentestress-test og
              en klar investeringsscore på under 60 sekunder.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/analyseren"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Åbn analyseren <ArrowRight size={16} />
              </Link>
              {DEALS_FOR[city.slug] && (
                <Link href={`/deals/${DEALS_FOR[city.slug].slug}`} className="text-sm font-semibold text-blue-300 hover:text-white">
                  Se de bedste handler {DEALS_FOR[city.slug].in} lige nu →
                </Link>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Andre markeder</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {others.map((c) => (
                <Link
                  key={c.slug}
                  href={`/investering-i-ejendom-${c.slug}`}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-600"
                >
                  Ejendom {c.inName}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/methodology" className="text-blue-600 hover:text-blue-700">Metode &amp; datakilder →</Link>
              <Link href="/investment-models" className="text-blue-600 hover:text-blue-700">Investeringsstrategier →</Link>
              <Link href="/glossary" className="text-blue-600 hover:text-blue-700">Ordbog →</Link>
              <Link href="/blog" className="text-blue-600 hover:text-blue-700">Guides →</Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
