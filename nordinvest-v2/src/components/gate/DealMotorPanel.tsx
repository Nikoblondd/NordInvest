import Link from "next/link";
import { ArrowRight, Bell, Filter, Map } from "lucide-react";

/* Where the interactive Deal-motor used to be on the public ranking pages. */
export function DealMotorPanel({ where }: { where?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.3)]">
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="text-[18px] font-semibold tracking-[-0.01em] text-slate-900">Søg selv{where ? ` ${where}` : ""} med Deal-motoren</p>
          <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-slate-600">Filtrér på boligtype, pris, afkast og overskud, se hele markedet på et kort, og få besked, når en ny bolig passer til dig. Deal-motoren er en del af NordInvest, som du får adgang til efter en kort samtale.</p>
          <Link href="/adgang" className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white hover:bg-blue-500 max-sm:w-full">Anmod om adgang <ArrowRight size={17} /></Link>
        </div>
        <ul className="grid gap-3 text-[15px] text-slate-700">
          {[[Filter, "Dine egne filtre og krav til overskud"], [Map, "Hele markedet på et kort"], [Bell, "Besked, når en ny bolig matcher"]].map(([Icon, t]) => {
            const I = Icon as typeof Filter;
            return <li key={t as string} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"><I size={18} className="shrink-0 text-blue-600" />{t as string}</li>;
          })}
        </ul>
      </div>
    </div>
  );
}
