import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { Footer } from "@/components/Footer";
import { geist } from "@/components/home/fonts";
import { Suspense } from "react";
import { site } from "@/lib/site";
import { HaveAccount } from "@/components/auth/HaveAccount";

/* The frame for public content pages: the landing nav, a breadcrumb, the footer. */
export function PublicShell({ crumbs, children }: { crumbs: { href: string; label: string }[]; children: ReactNode }) {
  return (
    <div className={`${geist.variable} min-h-screen bg-white font-[family-name:var(--font-geist)] text-slate-900 antialiased`}>
      <LandingNav />
      <main id="indhold">
        <nav aria-label="Brødkrummer" className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-slate-500">
            <li><Link href="/" className="hover:text-slate-900">NordInvest</Link></li>
            {crumbs.map((c, i) => (
              <li key={c.href} className="flex items-center gap-1">
                <ChevronRight size={13} aria-hidden />
                {i === crumbs.length - 1 ? <span aria-current="page" className="text-slate-700">{c.label}</span> : <Link href={c.href} className="hover:text-slate-900">{c.label}</Link>}
              </li>
            ))}
          </ol>
        </nav>
        {children}
      </main>
      <Footer />
    </div>
  );
}

/** The closing call to action on every content page. */
export function AccessBand({ title = "Klar til at regne på din næste bolig?", text = "NordInvest er et lukket system for private ejendomsinvestorer. Adgangen starter med en kort samtale om, hvordan du investerer, og hvad du har brug for." }: { title?: string; text?: string }) {
  return (
    <section className="bg-[#17213a] px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-[30px] font-semibold leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-[40px]">{title}</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-white/70">{text}</p>
          <Suspense><HaveAccount dark className="mt-4" /></Suspense>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/adgang" className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-lg bg-white px-5 text-[16px] font-semibold text-[#17213a] hover:bg-slate-100">Anmod om adgang <ArrowRight size={17} /></Link>
          <Link href="/kontakt" className="inline-flex min-h-[50px] items-center justify-center rounded-lg border border-white/25 px-5 text-[16px] font-semibold text-white hover:bg-white/10">Kontakt os</Link>
        </div>
      </div>
    </section>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  // eslint-disable-next-line react/no-danger
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function breadcrumbLd(items: { href: string; label: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ href: "/", label: "NordInvest" }, ...items].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: `${site.url}${c.href === "/" ? "" : c.href}` })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return { "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
}
