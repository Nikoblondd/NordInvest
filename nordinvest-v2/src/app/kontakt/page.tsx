import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Newspaper } from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import { ContactForm } from "@/components/ContactForm";
import { TOPICS, type TopicId } from "@/lib/contact";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Kontakt NordInvest" },
  description: "Skriv til NordInvest om spørgsmål, fejl, forslag, adgang eller samarbejde. Beskeden går direkte til contact@nordinvest.io.",
  alternates: { canonical: "/kontakt" },
};

export default function KontaktPage({ searchParams }: { searchParams: { emne?: string } }) {
  const topic = TOPICS.find((t) => t.id === searchParams.emne)?.id as TopicId | undefined;
  return (
    <PublicShell crumbs={[{ href: "/kontakt", label: "Kontakt" }]}>
      <section className="mx-auto max-w-[1180px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[48px]">Kontakt</h1>
        <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-slate-600">Vælg et emne, og skriv din besked. Den går direkte til vores indbakke, og vi svarer typisk inden for en arbejdsdag.</p>
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.2)] sm:p-8">
            <ContactForm topic={topic} page="/kontakt" />
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><Mail size={16} className="text-blue-600" /> E-mail</p>
              <p className="mt-1 text-[15px] text-slate-600">Du kan også skrive direkte til</p>
              <p className="mt-1 select-all text-[15px] font-semibold text-slate-900">{site.email}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-900"><Newspaper size={16} className="text-blue-600" /> Presse</p>
              <p className="mt-1 text-[15px] text-slate-600">Kontaktoplysninger, fakta og billeder til journalister.</p>
              <Link href="/presse" className="mt-2 inline-block text-[15px] font-semibold text-blue-700 hover:underline">Gå til presse</Link>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[14px] leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-900">{site.business.legalName}</p>
              <p>CVR {site.business.cvr}</p>
              <p>{site.business.address}, {site.business.country}</p>
            </div>
          </aside>
        </div>
      </section>
    </PublicShell>
  );
}
