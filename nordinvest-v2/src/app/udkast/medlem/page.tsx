import Link from "next/link";
import { Building2, CalendarDays, Calculator, ChevronRight, FileText, Home, LayoutGrid, ListChecks, Mail, Plus, Search, Settings, StickyNote } from "lucide-react";
import { geist } from "@/components/home/fonts";

export const metadata = { title: "Udkast: medlemsområde", robots: { index: false } };

/* Direction for the member workspace: one shell, the property ("sagen") at the centre. Example data. */

const NAV = [
  { Icon: LayoutGrid, l: "Overblik", on: true },
  { Icon: Building2, l: "Ejendomme", n: 6 },
  { Icon: Search, l: "Find boliger", n: 4 },
  { Icon: Calculator, l: "Analysér" },
  { Icon: ListChecks, l: "Opgaver", n: 3 },
];
const STAGE = { Screening: "bg-slate-600", Fremvisning: "bg-sky-600", Papirer: "bg-amber-400 text-amber-950", Bank: "bg-indigo-600", Bud: "bg-orange-600" } as Record<string, string>;

export default function DraftMember() {
  return (
    <div className={`${geist.variable} flex min-h-screen bg-slate-50 font-[family-name:var(--font-geist)] text-slate-900`}>
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-[#0b1b33] px-3 py-4 text-white lg:flex">
        <p className="px-2 text-[17px] font-semibold">NordInvest</p>
        <button className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-[14px] font-semibold"><Plus size={16} /> Tilføj bolig</button>
        <nav className="mt-5 space-y-0.5">
          {NAV.map(({ Icon, l, on, n }) => (
            <span key={l} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium ${on ? "bg-white/10 text-white" : "text-white/65"}`}>
              <Icon size={17} /> <span className="flex-1">{l}</span>{n && <span className="text-[12px] tabular-nums text-white/50">{n}</span>}
            </span>
          ))}
        </nav>
        <div className="mt-auto space-y-0.5">
          <span className="flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] text-white/65"><Settings size={17} /> Konto</span>
          <span className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-white/65"><Mail size={16} /> Kontakt</span>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[14px] text-slate-400 sm:max-w-md"><Search size={16} /> <span className="truncate">Indsæt et boliglink eller søg en adresse</span></div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-[13px] font-semibold text-white">MH</span>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Godmorgen, Mette</h1>
          <p className="text-[15px] text-slate-500">Mandag 12. oktober · 3 ting kræver dig i dag</p>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[["I gang", "6", "boliger i din pipeline"], ["Fremvisninger", "2", "denne uge"], ["Bud ude", "1", "Torvet 2, svar i dag"], ["Nye muligheder", "4", "matcher din profil"]].map(([l, v, h]) => (
              <div key={l} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[13px] text-slate-500">{l}</p>
                <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums">{v}</p>
                <p className="mt-1.5 truncate text-[13px] text-slate-500">{h}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-[16px] font-semibold">Næste skridt</h2><span className="text-[14px] font-medium text-blue-700">Alle opgaver</span></div>
              <ul className="divide-y divide-slate-100">
                {[["Svar på modbud", "Torvet 2, Viborg", "I dag 12.00", "Bud", true], ["Fremvisning", "Algade 3, Aalborg", "Tirs. 16.00", "Fremvisning"], ["Bankmøde", "Kongensgade 7, Esbjerg", "Tors. 09.00", "Bank"], ["Læs referaterne", "Nørregade 41, Odense", "Ingen dato", "Papirer"]].map(([t, a, d, s, hot]) => (
                  <li key={t as string} className="flex items-center gap-3 px-4 py-3">
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{t}</span><span className="block truncate text-[13px] text-slate-500">{a}</span></span>
                    <span className={`hidden rounded px-1.5 py-0.5 text-[11px] font-semibold text-white sm:inline ${STAGE[s as string]}`}>{s}</span>
                    <span className={`shrink-0 text-[13px] tabular-nums ${hot ? "font-semibold text-blue-700" : "text-slate-500"}`}>{d}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="text-[16px] font-semibold">Nye muligheder</h2><span className="text-[14px] font-medium text-blue-700">Deal-motoren</span></div>
              <ul className="divide-y divide-slate-100">
                {[["Algade 9", "7500 Holstebro", "1.150.000 kr.", "+2.120"], ["Søndergade 14", "8000 Aarhus C", "2.495.000 kr.", "+1.850"], ["Nørregade 41", "5000 Odense C", "2.100.000 kr.", "+940"]].map(([a, c, p, cf]) => (
                  <li key={a} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Home size={18} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{a}</span><span className="block truncate text-[13px] text-slate-500">{c} · {p}</span></span>
                    <span className="shrink-0 rounded bg-emerald-50 px-1.5 text-[12px] font-semibold tabular-nums text-emerald-700">{cf} kr./md.</span>
                    <span className="hidden h-8 items-center rounded-lg border border-slate-200 px-2.5 text-[13px] font-semibold sm:flex">Gem</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* The case: how one property looks when opened */}
          <h2 className="mt-10 text-[13px] font-semibold text-slate-500">Når du åbner en bolig</h2>
          <section className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><Home size={22} /></span>
              <div className="min-w-0 flex-1"><p className="text-[18px] font-semibold">Torvet 2</p><p className="text-[14px] text-slate-500">8800 Viborg · 1.450.000 kr. · ejerlejlighed, 74 m²</p></div>
              <span className="rounded-md bg-orange-600 px-2.5 py-1.5 text-[13px] font-semibold text-white">Bud</span>
            </div>
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 text-[14px] font-semibold [scrollbar-width:none]">
              {["Overblik", "Analyse", "Papirer 4", "Opgaver og noter", "Kontakt", "Bud"].map((t, i) => <span key={t} className={`whitespace-nowrap border-b-2 px-3 py-3 ${i === 0 ? "border-slate-900" : "border-transparent text-slate-500"}`}>{t}</span>)}
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3"><p className="text-[13px] text-slate-500">Overskud</p><p className="text-[22px] font-semibold tabular-nums text-emerald-700">+2.780 kr./md.</p><p className="text-[13px] text-slate-500">Fra analysen 8. okt.</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="flex items-center gap-1.5 text-[13px] text-slate-500"><FileText size={14} /> Papirer</p><p className="text-[15px] font-semibold">1 høj risiko</p><p className="text-[13px] text-slate-500">Ekstraordinær indbetaling, side 11</p></div>
              <div className="rounded-lg bg-slate-50 p-3"><p className="flex items-center gap-1.5 text-[13px] text-slate-500"><StickyNote size={14} /> Seneste note</p><p className="text-[15px]">Sælger vil gerne have overtagelse 1. jan. Mægler: Line, 31 22 45 80.</p></div>
            </div>
            <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-[14px] text-slate-600"><CalendarDays size={15} /> Næste: Svar på modbud i dag 12.00 <ChevronRight size={15} className="ml-auto" /></div>
          </section>
        </div>
      </main>

      {/* Bottom bar (phones) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ Icon, l, on }) => (
          <span key={l} className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${on ? "text-blue-700" : "text-slate-500"}`}><Icon size={20} />{l === "Find boliger" ? "Find" : l}</span>
        ))}
      </nav>
      <Link href="/udkast/forside" className="sr-only">Forside</Link>
    </div>
  );
}
