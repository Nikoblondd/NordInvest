import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { site } from "@/lib/site";

/*
 * The person behind the numbers, on every investment analysis: who made the
 * model, how to reach him, and where the method is written down. Professionals
 * answer for the figures they pass on, so they need to know who to call.
 */
export function FounderNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:p-6">
      <Image src={site.founder.photo} alt={`${site.founder.name}, stifter af NordInvest`} width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold text-slate-900">{site.founder.name}, stifter af NordInvest</p>
        <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
          Jeg har bygget beregningsmodellen og står selv for den. Er et tal forkert, eller mangler der en post i driftsbudgettet, så ring eller skriv til mig. Rettelser går direkte ind i modellen{compact ? "." : ", og hver ændring står i metodebeskrivelsen."}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
          <a href={site.phoneHref} className="inline-flex items-center gap-1.5 font-semibold text-slate-900 hover:underline"><Phone size={15} strokeWidth={1.8} /> {site.phone}</a>
          <span className="select-all text-slate-600">{site.email}</span>
          <Link href="/methodology#investeringsejendomme" className="font-medium text-blue-700 hover:underline">Metode og forudsætninger</Link>
          <span className="text-slate-500">CVR {site.business.cvr}</span>
        </p>
      </div>
    </div>
  );
}
