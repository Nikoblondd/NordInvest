import { Building2, CalendarDays, FileText, Home, LayoutGrid, ListChecks, Search, Sparkles } from "lucide-react";

/*
 * A small, static rendering of the member workspace ("Overblik") used on the
 * public page. It shows the real layout and wording of the product with
 * example properties; it is labelled as an example where it is shown.
 */

const NAV = [
  { Icon: LayoutGrid, on: true },
  { Icon: Building2 },
  { Icon: Search },
  { Icon: ListChecks },
  { Icon: FileText },
];

export function WorkspacePreview() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-[0_30px_80px_-30px_rgba(11,27,51,0.45)]">
        <div className="flex">
          <aside className="hidden w-12 shrink-0 flex-col items-center gap-2 bg-[#0b1b33] py-3 sm:flex">
            <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-md bg-white text-[11px] font-bold text-[#0b1b33]">N</span>
            {NAV.map(({ Icon, on }, i) => (
              <span key={i} className={`flex h-8 w-8 items-center justify-center rounded-md ${on ? "bg-white/15 text-white" : "text-white/50"}`}><Icon size={15} /></span>
            ))}
          </aside>
          <div className="min-w-0 flex-1 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-slate-900">Godmorgen, Mette</p>
                <p className="text-[11px] text-slate-500">Mandag 12. oktober</p>
              </div>
              <span className="hidden h-7 w-40 items-center gap-1.5 rounded-md border border-slate-200 px-2 text-[11px] text-slate-400 sm:flex"><Search size={12} /> Søg adresse eller link</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["I gang", "6", "boliger"],
                ["Fremvisninger", "2", "denne uge"],
                ["Bud ude", "1", "Torvet 2"],
                ["Nye muligheder", "4", "match din profil"],
              ].map(([l, v, h]) => (
                <div key={l} className="rounded-lg border border-slate-200 p-2">
                  <p className="text-[10px] text-slate-500">{l}</p>
                  <p className="text-[18px] font-semibold leading-tight tabular-nums text-slate-900">{v}</p>
                  <p className="truncate text-[10px] text-slate-400">{h}</p>
                </div>
              ))}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1.2fr_1fr]">
              <div className="rounded-lg border border-slate-200">
                <p className="border-b border-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">Næste skridt</p>
                {[
                  ["I dag 12.00", "Svar på modbud", "Torvet 2, Viborg", "text-blue-700"],
                  ["Tirs. 16.00", "Fremvisning", "Algade 3, Aalborg", "text-slate-500"],
                  ["Tors. 09.00", "Bankmøde", "Kongensgade 7, Esbjerg", "text-slate-500"],
                ].map(([d, t, a, c]) => (
                  <div key={t} className="flex items-center gap-2 border-b border-slate-50 px-2.5 py-1.5 last:border-0">
                    <CalendarDays size={12} className="shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-slate-900">{t}</p>
                      <p className="truncate text-[10px] text-slate-500">{a}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-medium ${c}`}>{d}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-slate-200">
                <p className="border-b border-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">Nye muligheder</p>
                {[
                  ["Søndergade 14, Aarhus", "+1.850"],
                  ["Nørregade 41, Odense", "+940"],
                  ["Algade 9, Holstebro", "+2.120"],
                ].map(([a, cf]) => (
                  <div key={a} className="flex items-center gap-2 border-b border-slate-50 px-2.5 py-1.5 last:border-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400"><Home size={12} /></span>
                    <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-900">{a}</p>
                    <span className="shrink-0 rounded bg-emerald-50 px-1 text-[10px] font-semibold tabular-nums text-emerald-700">{cf} kr./md.</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Floating notices, like the product's own notifications */}
      <div className="absolute -bottom-8 -left-3 hidden w-60 rounded-xl bg-[#0b1b33] p-3 text-white shadow-xl sm:block lg:-left-10">
        <p className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-300"><Sparkles size={11} /> Lige nu</p>
        <p className="mt-1 text-[13px] font-semibold leading-snug">Referatet er læst</p>
        <p className="mt-0.5 text-[11px] leading-snug text-white/70">2 forhold at spørge ind til: tagrenovering (side 4) og ekstraordinær indbetaling (side 11).</p>
      </div>
      <div className="absolute -right-3 -top-5 hidden w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:block lg:-right-8">
        <p className="text-[10px] font-medium text-blue-700">Ny bolig matcher din profil</p>
        <p className="mt-1 text-[13px] font-semibold text-slate-900">Algade 9, Holstebro</p>
        <p className="text-[11px] text-slate-500">1.150.000 kr. · 6,8 % afkast</p>
      </div>
    </div>
  );
}
