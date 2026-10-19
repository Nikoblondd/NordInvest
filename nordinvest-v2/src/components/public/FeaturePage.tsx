import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AnalysisScreen, BankScreen, CalendarScreen, DealScreen, DocsScreen, OfferScreen, OverviewScreen, PipelineScreen } from "@/components/landing/screens";
import { Faq } from "@/components/landing/Faq";
import { FEATURES, type Feature, type ScreenKey } from "@/lib/features";
import { site } from "@/lib/site";
import { AccessBand, JsonLd, PublicShell, breadcrumbLd, faqLd } from "./PublicShell";

const SCREEN: Record<ScreenKey, () => JSX.Element> = {
  analysis: AnalysisScreen, bank: BankScreen, deal: DealScreen, docs: DocsScreen, offer: OfferScreen, pipeline: PipelineScreen, calendar: CalendarScreen, overview: OverviewScreen,
};

/* One feature page: what it does, how it works, who it is for, and the FAQ. */
export function FeaturePage({ f }: { f: Feature }) {
  const crumbs = [{ href: "/funktioner", label: "Funktioner" }, { href: `/funktioner/${f.slug}`, label: f.nav }];
  const First = SCREEN[f.screens[0]];
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${site.url}/funktioner/${f.slug}#webpage`, url: `${site.url}/funktioner/${f.slug}`, name: f.h1, description: f.metaDescription, inLanguage: "da-DK", isPartOf: { "@id": `${site.url}/#website` }, about: { "@id": `${site.url}/#app` }, publisher: { "@id": `${site.url}/#organization` } },
      breadcrumbLd(crumbs),
      faqLd(f.faq),
    ],
  };
  return (
    <PublicShell crumbs={crumbs}>
      <JsonLd data={ld} />
      <section className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:px-8 lg:pt-12">
        <div>
          <p className="text-[14px] font-semibold text-blue-600">{f.nav}</p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.06] tracking-[-0.035em] text-[#17213a] [text-wrap:balance] sm:text-[48px]">{f.h1}</h1>
          <p className="mt-5 max-w-[36rem] text-[18px] leading-relaxed text-slate-600">{f.lead}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/adgang" className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white hover:bg-blue-500">Anmod om adgang <ArrowRight size={17} /></Link>
            <Link href="/funktioner" className="inline-flex min-h-[50px] items-center justify-center rounded-lg border border-slate-300 px-5 text-[16px] font-semibold text-slate-800 hover:border-slate-400">Alle funktioner</Link>
          </div>
        </div>
        <div className="min-w-0"><First /></div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5 text-[17px] leading-relaxed text-slate-700">
            {f.intro.map((p) => <p key={p.slice(0, 30)}>{p}</p>)}
          </div>
          <ol className="space-y-3">
            {f.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[14px] font-bold text-white">{i + 1}</span>
                <span><span className="block text-[17px] font-semibold text-slate-900">{s.title}</span><span className="mt-1 block text-[15px] leading-relaxed text-slate-600">{s.text}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="max-w-2xl text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#17213a] sm:text-[38px]">Det får du</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {f.points.map((p) => (
              <div key={p.title} className="rounded-2xl border border-slate-200 p-5">
                <Check size={18} className="text-emerald-600" />
                <h3 className="mt-3 text-[17px] font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{p.text}</p>
              </div>
            ))}
          </div>
          {f.screens.length > 1 && (
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {f.screens.slice(1).map((k) => { const S = SCREEN[k]; return <div key={k} className="min-w-0"><S /></div>; })}
            </div>
          )}
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#17213a] sm:text-[38px]">Til den måde, du investerer på</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {f.investors.map((x) => (
              <div key={x.who} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-[16px] font-semibold text-slate-900">{x.who}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{x.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#17213a] sm:text-[38px]">Spørgsmål og svar</h2>
            <div className="mt-6"><Faq items={f.faq} /></div>
          </div>
          <aside>
            <h2 className="text-[18px] font-semibold text-slate-900">Læs også</h2>
            <ul className="mt-3 space-y-2">
              {f.related.map((r) => <li key={r.href}><Link href={r.href} className="inline-flex min-h-[40px] items-center gap-1.5 text-[16px] font-medium text-blue-700 hover:underline">{r.label} <ArrowRight size={15} /></Link></li>)}
            </ul>
            <h2 className="mt-8 text-[18px] font-semibold text-slate-900">Andre funktioner</h2>
            <ul className="mt-3 space-y-2">
              {FEATURES.filter((x) => x.slug !== f.slug).map((x) => <li key={x.slug}><Link href={`/funktioner/${x.slug}`} className="inline-flex min-h-[40px] items-center gap-1.5 text-[16px] font-medium text-slate-700 hover:text-blue-700">{x.nav} <ArrowRight size={15} /></Link></li>)}
            </ul>
          </aside>
        </div>
      </section>
      <AccessBand />
    </PublicShell>
  );
}
