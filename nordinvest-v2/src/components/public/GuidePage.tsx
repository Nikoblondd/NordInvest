import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Faq } from "@/components/landing/Faq";
import type { Guide } from "@/lib/guides";
import { site } from "@/lib/site";
import { AccessBand, JsonLd, PublicShell, breadcrumbLd, faqLd } from "./PublicShell";

/*
 * A long-form guide: the answer first, a table of contents, sourced sections,
 * an optional tool in the middle, FAQ, sources and the matching feature.
 */
export function GuidePage({ g, tool, toolAfter }: { g: Guide; tool?: ReactNode; toolAfter?: string }) {
  const crumbs = [{ href: "/blog", label: "Viden" }, { href: g.path, label: g.h1.split(":")[0] }];
  const date = new Date(`${g.updated}T12:00`).toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${site.url}${g.path}#article`,
        headline: g.h1,
        description: g.metaDescription,
        inLanguage: "da-DK",
        datePublished: g.updated,
        dateModified: g.updated,
        mainEntityOfPage: `${site.url}${g.path}`,
        image: `${site.url}/opengraph-image.jpg`,
        author: { "@type": "Person", name: site.founder.name, url: `${site.url}/om` },
        publisher: { "@id": `${site.url}/#organization` },
        citation: g.sources.map((s) => s.href),
      },
      breadcrumbLd(crumbs),
      faqLd(g.faq),
    ],
  };
  return (
    <PublicShell crumbs={crumbs}>
      <JsonLd data={ld} />
      <article className="mx-auto max-w-[1180px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <header className="max-w-3xl">
          <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#0b1b33] [text-wrap:balance] sm:text-[46px]">{g.h1}</h1>
          <p className="mt-5 text-[19px] leading-relaxed text-slate-600">{g.lead}</p>
          <div className="mt-6 flex items-center gap-3 text-[14px] text-slate-500">
            <Image src="/founder.jpg" alt={site.founder.name} width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            <span><Link href="/om" className="font-semibold text-slate-800 hover:underline">{site.founder.name}</Link>, NordInvest · Opdateret {date}</span>
          </div>
        </header>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 max-w-3xl space-y-12">
            {g.sections.map((sec) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24">
                <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#0b1b33] sm:text-[30px]">{sec.h2}</h2>
                <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-slate-700">{sec.body.map((p) => <p key={p.slice(0, 40)}>{p}</p>)}</div>
                {sec.list && <ul className="mt-4 space-y-2.5 text-[17px] leading-relaxed text-slate-700">{sec.list.map((l) => <li key={l} className="flex gap-3"><span aria-hidden className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />{l}</li>)}</ul>}
                {sec.table && (
                  <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[560px] text-left text-[15px]">
                      <thead className="bg-slate-50 text-[13px] font-semibold text-slate-600"><tr>{sec.table.head.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-slate-100">{sec.table.rows.map((r) => <tr key={r[0]} className="align-top">{r.map((c, i) => <td key={i} className={`px-4 py-3 ${i === 0 ? "font-semibold text-slate-900" : "text-slate-700"}`}>{c}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
                {tool && toolAfter === sec.id && <div className="mt-6">{tool}</div>}
              </section>
            ))}
            <section>
              <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-[#0b1b33] sm:text-[30px]">Spørgsmål og svar</h2>
              <div className="mt-5"><Faq items={g.faq} /></div>
            </section>
            <section className="border-t border-slate-200 pt-6">
              <h2 className="text-[15px] font-semibold text-slate-900">Kilder</h2>
              <ul className="mt-2 space-y-1 text-[14px]">{g.sources.map((s) => <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline">{s.label} <ExternalLink size={12} /></a></li>)}</ul>
              <p className="mt-3 text-[13px] text-slate-500">Guiden er generel information, ikke personlig skatte- eller juridisk rådgivning.</p>
            </section>
          </div>
          <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
            <nav aria-label="Indhold" className="rounded-2xl border border-slate-200 p-5">
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Indhold</p>
              <ol className="mt-3 space-y-2 text-[15px]">{g.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="text-slate-700 hover:text-blue-700">{s.h2.split(":")[0]}</a></li>)}</ol>
            </nav>
            <div className="rounded-2xl bg-[#0b1b33] p-5 text-white">
              <p className="text-[16px] font-semibold">{g.feature.label}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{g.feature.text}</p>
              <Link href={g.feature.href} className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-blue-300 hover:underline">Se hvordan <ArrowRight size={14} /></Link>
            </div>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-slate-500">Læs også</p>
              <ul className="mt-2 space-y-1.5">{g.related.map((r) => <li key={r.href}><Link href={r.href} className="text-[15px] font-medium text-blue-700 hover:underline">{r.label}</Link></li>)}</ul>
            </div>
          </aside>
        </div>
      </article>
      <AccessBand />
    </PublicShell>
  );
}
