import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { TERMS } from "@/lib/terms";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ordbog om ejendomsinvestering: begreberne forklaret",
  description:
    "Cash flow, afkastningsgrad, kontantafkast, markedsleje, omkostningsbestemt leje og andre begreber om udlejning og ejendomsinvestering forklaret med formel og eksempel.",
  alternates: { canonical: "/ordbog" },
};

export default function OrdbogPage() {
  const terms = [...TERMS].sort((a, b) => a.term.localeCompare(b.term, "da"));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "NordInvests ordbog om ejendomsinvestering",
    url: `${site.url}/ordbog`,
    hasDefinedTerm: terms.map((t) => ({ "@type": "DefinedTerm", name: t.term, url: `${site.url}/ordbog/${t.slug}` })),
  };
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[48px]">Ordbog om ejendomsinvestering</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
          Begreberne, du møder, når du køber til udlejning, forklaret med formel og regneeksempel. Flere korte forklaringer står i{" "}
          <Link href="/glossary" className="font-medium text-blue-700 underline underline-offset-2">den store ordliste</Link>.
        </p>
        <ul className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
          {terms.map((t) => (
            <li key={t.slug}>
              <Link href={`/ordbog/${t.slug}`} className="block py-5 hover:bg-white">
                <span className="text-[18px] font-semibold text-slate-900">{t.term}</span>
                <span className="mt-1 block text-[15px] leading-relaxed text-slate-600">{t.definition.split(". ")[0]}.</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Footer />
    </main>
  );
}
