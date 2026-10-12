import type { ReactNode } from "react";
import { Bell, Building2, CalendarDays, Calculator, Check, ChevronDown, FileText, LayoutGrid, ListChecks, Plus, Search, SlidersHorizontal } from "lucide-react";

/*
 * Product screens for the public page. They are small, static renderings of
 * the member workspace with example properties, built from the same layout
 * and wording as the product. Photos are generated illustrations.
 */

export const PHOTO = (n: number) => `/landing/p${n}.jpg`;
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");

const NAV = [LayoutGrid, Building2, Search, Calculator, ListChecks, CalendarDays];

/** The app window: dark rail, top bar, content. */
export function AppFrame({ active = 0, children, className }: { active?: number; children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-[18px] border border-[#0b1b33]/10 bg-white text-slate-900 shadow-[0_40px_100px_-40px_rgba(11,27,51,0.55),0_0_0_1px_rgba(11,27,51,0.03)]", className)}>
      <div className="flex">
        <aside className="hidden w-[52px] shrink-0 flex-col items-center gap-1.5 bg-[#0b1b33] py-3 sm:flex">
          <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[12px] font-bold text-[#0b1b33]">N</span>
          {NAV.map((Icon, i) => (
            <span key={i} className={cx("flex h-8 w-8 items-center justify-center rounded-lg", i === active ? "bg-white/15 text-white" : "text-white/45")}><Icon size={15} /></span>
          ))}
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <span className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-slate-50 px-2 text-[11px] text-slate-400 ring-1 ring-slate-200/70 sm:max-w-[260px]"><Search size={12} /> <span className="truncate">Indsæt boliglink eller søg adresse</span></span>
            <span className="ml-auto flex h-6 w-6 items-center justify-center text-slate-400"><Bell size={13} /></span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[9px] font-semibold text-white">MH</span>
          </div>
          <div className="p-3 sm:p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** A notification card that floats over a screen. */
export function Notice({ tone = "blue", label, title, text, action, dark, className }: { tone?: "blue" | "green" | "amber"; label: string; title: string; text?: string; action?: string; dark?: boolean; className?: string }) {
  const bar = tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-400" : "bg-blue-500";
  const dot = tone === "green" ? "bg-emerald-400" : tone === "amber" ? "bg-amber-400" : "bg-blue-500";
  return (
    <div className={cx("w-[248px] overflow-hidden rounded-xl shadow-[0_20px_50px_-15px_rgba(11,27,51,0.45)]", dark ? "bg-[#0b1b33] text-white ring-1 ring-white/10" : "bg-white text-slate-900 ring-1 ring-slate-200", className)}>
      <div className={cx("h-[3px]", bar)} />
      <div className="p-3.5">
        <p className={cx("flex items-center gap-1.5 text-[11px] font-medium", dark ? "text-white/60" : "text-slate-500")}><span className={cx("h-1.5 w-1.5 rounded-full", dot)} />{label}</p>
        <p className="mt-1 text-[15px] font-semibold leading-snug">{title}</p>
        {text && <p className={cx("mt-0.5 text-[12px] leading-snug", dark ? "text-white/65" : "text-slate-500")}>{text}</p>}
        {action && <span className="mt-2.5 inline-flex h-7 items-center rounded-md bg-blue-600 px-2.5 text-[11px] font-semibold text-white">{action}</span>}
      </div>
    </div>
  );
}

const Pill = ({ v }: { v: string }) => <span className="whitespace-nowrap rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700">{v}</span>;
const Thumb = ({ n, className }: { n: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={PHOTO(n)} alt="" className={cx("shrink-0 rounded-md bg-slate-200 object-cover", className ?? "h-8 w-8")} />
);

function Ring({ v }: { v: number }) {
  const c = 2 * Math.PI * 13;
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" className="shrink-0" aria-hidden>
      <circle cx="17" cy="17" r="13" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
      <circle cx="17" cy="17" r="13" fill="none" stroke={v >= 70 ? "#059669" : "#2563eb"} strokeWidth="3.5" strokeDasharray={`${(v / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 17 17)" />
      <text x="17" y="21" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">{v}</text>
    </svg>
  );
}

/* ---------- Overblik ---------- */
export function OverviewScreen() {
  const stages = [["Screening", 3, "bg-slate-400"], ["Fremvisning", 2, "bg-sky-500"], ["Papirer", 1, "bg-amber-400"], ["Bank", 1, "bg-indigo-500"], ["Bud", 1, "bg-orange-500"]] as const;
  return (
    <AppFrame active={0}>
      <div className="flex items-end justify-between">
        <div><p className="text-[16px] font-semibold tracking-[-0.01em]">Godmorgen, Mette</p><p className="text-[11px] text-slate-500">Mandag 12. oktober · 3 ting kræver dig i dag</p></div>
        <span className="hidden h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[11px] font-semibold text-white sm:flex"><Plus size={12} /> Tilføj bolig</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[["I gang", "8", "11,4 mio. kr. i alt"], ["Fremvisninger", "2", "denne uge"], ["Bud ude", "1", "svar i dag"], ["Nye muligheder", "4", "matcher din profil"]].map(([l, v, h]) => (
          <div key={l} className="rounded-lg border border-slate-200/80 p-2.5">
            <p className="text-[10px] font-medium text-slate-500">{l}</p>
            <p className="mt-0.5 text-[20px] font-semibold leading-none tabular-nums tracking-[-0.02em]">{v}</p>
            <p className="mt-1 truncate text-[10px] text-slate-400">{h}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg border border-slate-200/80 p-2.5">
        <div className="flex items-center justify-between text-[10px]"><span className="font-semibold text-slate-700">Pipeline</span><span className="text-slate-400">8 boliger</span></div>
        <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full">{stages.map(([l, n, c]) => <span key={l} className={c} style={{ flex: n }} />)}</div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">{stages.map(([l, n, c]) => <span key={l} className="flex items-center gap-1"><span className={cx("h-1.5 w-1.5 rounded-full", c)} />{l} {n}</span>)}</div>
      </div>
      <div className="mt-2 grid gap-2 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-lg border border-slate-200/80">
          <p className="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5 text-[11px] font-semibold">Næste skridt <span className="font-medium text-blue-600">Alle</span></p>
          {[["Svar på modbud", "Torvet 2, Viborg", "I dag 12.00", true], ["Fremvisning", "Algade 3, Aalborg", "Tirs. 16.00"], ["Bankmøde", "Kongensgade 7, Esbjerg", "Tors. 09.00"]].map(([t, a, d, hot]) => (
            <div key={t as string} className="flex items-center gap-2 border-b border-slate-50 px-2.5 py-1.5 last:border-0">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-slate-300" />
              <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium">{t}</p><p className="truncate text-[10px] text-slate-500">{a}</p></div>
              <span className={cx("shrink-0 text-[10px] tabular-nums", hot ? "font-semibold text-blue-600" : "text-slate-500")}>{d}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-slate-200/80">
          <p className="flex items-center justify-between border-b border-slate-100 px-2.5 py-1.5 text-[11px] font-semibold">Nye muligheder <span className="font-medium text-blue-600">Deal-motoren</span></p>
          {[[9, "Algade 9, Holstebro", "+2.120"], [1, "Søndergade 14, Aarhus", "+1.850"], [5, "Bakkevej 6, Randers", "+1.240"]].map(([n, a, cf]) => (
            <div key={a as string} className="flex items-center gap-2 border-b border-slate-50 px-2.5 py-1.5 last:border-0">
              <Thumb n={n as number} className="h-7 w-7" />
              <p className="min-w-0 flex-1 truncate text-[11px] font-medium">{a}</p>
              <Pill v={`${cf} kr./md.`} />
            </div>
          ))}
        </div>
      </div>
    </AppFrame>
  );
}

/* ---------- Deal-motor ---------- */
export function DealScreen() {
  const rows = [[9, "Algade 9", "7500 Holstebro · 3 vær. · 78 m²", "1.150.000", "+2.120", 82, true], [1, "Søndergade 14", "8000 Aarhus C · 2 vær. · 61 m²", "2.495.000", "+1.850", 76], [5, "Bakkevej 6", "8900 Randers · 4 vær. · 104 m²", "1.395.000", "+1.240", 71], [2, "Lindevej 22", "7100 Vejle · rækkehus · 96 m²", "1.795.000", "+980", 66]] as const;
  return (
    <AppFrame active={2}>
      <div className="flex items-center justify-between"><p className="text-[15px] font-semibold">Find boliger</p><span className="flex items-center gap-1 text-[10px] text-slate-500"><SlidersHorizontal size={11} /> Filtre</span></div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["Jylland", "Lejlighed og rækkehus", "Under 2,5 mio.", "Overskud over 0"].map((c) => <span key={c} className="flex h-6 items-center gap-1 rounded-md bg-slate-100 px-2 text-[10px] font-medium text-slate-700">{c} <ChevronDown size={10} /></span>)}
      </div>
      <p className="mt-2.5 text-[11px] text-slate-500"><b className="text-slate-900">2.418 boliger</b> regnet igennem i dag · <b className="text-emerald-700">312 betaler sig selv</b></p>
      <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200/80">
        {rows.map(([n, a, s, p, cf, sc, saved]) => (
          <div key={a} className={cx("flex items-center gap-2.5 px-2.5 py-2", saved && "bg-blue-50/50")}>
            <Thumb n={n} className="h-10 w-12" />
            <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-semibold">{a}</p><p className="truncate text-[10px] text-slate-500">{s}</p></div>
            <div className="hidden text-right sm:block"><p className="text-[11px] font-semibold tabular-nums">{p} kr.</p><Pill v={`${cf} kr./md.`} /></div>
            <Ring v={sc} />
            <span className={cx("hidden h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold sm:flex", saved ? "bg-emerald-600 text-white" : "border border-slate-200 text-slate-700")}>{saved ? <><Check size={11} /> Gemt</> : "Gem"}</span>
          </div>
        ))}
      </div>
    </AppFrame>
  );
}

/* ---------- Analyse ---------- */
export function AnalysisScreen() {
  const flow = [["Husleje", 8900, "bg-emerald-500"], ["Lån", -4310, "bg-slate-400"], ["Ejerudgift", -1650, "bg-slate-300"], ["Vedligehold", -820, "bg-slate-300"]] as const;
  return (
    <AppFrame active={3}>
      <div className="flex items-center gap-2.5">
        <Thumb n={9} className="h-10 w-12" />
        <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold">Algade 9, 7500 Holstebro</p><p className="text-[10px] text-slate-500">1.150.000 kr. · BBR: 78 m², bygget 1938 · solgte priser hentet</p></div>
        <span className="hidden rounded-md bg-sky-600 px-2 py-1 text-[10px] font-semibold text-white sm:block">Fremvisning</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["Overskud", "+2.120 kr./md.", "text-emerald-700"], ["Afkast af prisen", "6,8 %", ""], ["Renten må stige til", "7,1 %", ""]].map(([l, v, c]) => (
          <div key={l} className="rounded-lg bg-slate-50 p-2"><p className="truncate text-[10px] text-slate-500">{l}</p><p className={cx("mt-0.5 text-[14px] font-semibold tabular-nums sm:text-[16px]", c)}>{v}</p></div>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1.2fr_1fr]">
        <div className="rounded-lg border border-slate-200/80 p-2.5">
          <p className="text-[11px] font-semibold">Hver måned</p>
          <div className="mt-2 space-y-1.5">
            {flow.map(([l, v, c]) => (
              <div key={l} className="flex items-center gap-2 text-[10px]">
                <span className="w-16 shrink-0 text-slate-500">{l}</span>
                <span className="h-2.5 flex-1 rounded-sm bg-slate-50"><span className={cx("block h-full rounded-sm", c)} style={{ width: `${(Math.abs(v) / 8900) * 100}%` }} /></span>
                <span className="w-12 shrink-0 text-right tabular-nums">{v > 0 ? "" : "-"}{Math.abs(v).toLocaleString("da-DK")}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 border-t border-slate-100 pt-1.5 text-[10px] font-semibold"><span className="w-16 shrink-0">Overskud</span><span className="h-2.5 flex-1"><span className="block h-full rounded-sm bg-emerald-600" style={{ width: "24%" }} /></span><span className="w-12 shrink-0 text-right tabular-nums text-emerald-700">2.120</span></div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200/80 p-2.5">
          <p className="text-[11px] font-semibold">Hvis renten stiger</p>
          <div className="mt-2 flex h-[74px] items-end gap-1.5">
            {[[4, 2120], [5, 1540], [6, 940], [7, 330], [8, -280]].map(([r, v]) => (
              <div key={r} className="flex flex-1 flex-col items-center gap-1">
                <span className={cx("w-full rounded-sm", v >= 0 ? "bg-emerald-500" : "bg-rose-400")} style={{ height: `${(Math.abs(v) / 2120) * 52 + 4}px` }} />
                <span className="text-[9px] tabular-nums text-slate-500">{r} %</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

/* ---------- Papirer ---------- */
export function DocsScreen() {
  return (
    <AppFrame active={1}>
      <div className="flex items-center gap-2"><Thumb n={9} className="h-7 w-7" /><p className="text-[13px] font-semibold">Algade 9 · Papirer</p></div>
      <div className="mt-2.5 grid gap-2 sm:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-1.5">
          {[["Salgsopstilling", "12 sider", "done"], ["Referat 2025", "14 sider", "on"], ["Vedligeholdelsesplan", "Læser side 9 af 22", "busy"], ["Energimærke", "Mangler", "miss"]].map(([t, s, st]) => (
            <div key={t} className={cx("flex items-center gap-2 rounded-lg border px-2 py-1.5", st === "on" ? "border-blue-300 bg-blue-50/60" : "border-slate-200/80")}>
              <FileText size={13} className={st === "miss" ? "text-slate-300" : "text-slate-500"} />
              <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-medium">{t}</p><p className={cx("truncate text-[9px]", st === "busy" ? "text-blue-600" : st === "miss" ? "text-amber-700" : "text-slate-400")}>{s}</p></div>
              {st === "done" || st === "on" ? <Check size={12} className="text-emerald-600" /> : null}
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-slate-200/80 p-2.5">
          <p className="text-[12px] font-semibold leading-snug">Nyt tag i 2026. Din andel betales oven i fællesudgiften.</p>
          {[["Høj", "Ekstraordinær indbetaling, ca. 38.000 kr.", "Side 11", "bg-rose-50 text-rose-700"], ["Middel", "Udlejning over 2 år kræver bestyrelsens ja", "Side 4", "bg-amber-50 text-amber-800"], ["Lav", "Grundfond 412.000 kr. er under anbefalet niveau", "Side 7", "bg-slate-100 text-slate-600"]].map(([l, t, s, c]) => (
            <div key={t} className="mt-1.5 flex items-start gap-1.5 rounded-md bg-slate-50/80 p-1.5">
              <span className={cx("shrink-0 rounded px-1 text-[9px] font-semibold", c)}>{l}</span>
              <p className="min-w-0 flex-1 text-[10px] leading-snug">{t}</p>
              <span className="shrink-0 text-[9px] text-slate-400">{s}</span>
            </div>
          ))}
          <p className="mt-2 text-[10px] font-semibold text-slate-700">Spørg mægleren</p>
          <p className="text-[10px] text-slate-500">Er indbetalingen indregnet i prisen?</p>
        </div>
      </div>
    </AppFrame>
  );
}

/* ---------- Bud ---------- */
export function OfferScreen() {
  return (
    <AppFrame active={1}>
      <div className="flex items-center gap-2"><Thumb n={9} className="h-7 w-7" /><p className="text-[13px] font-semibold">Algade 9 · Bud</p><span className="ml-auto rounded-md bg-orange-600 px-2 py-0.5 text-[10px] font-semibold text-white">Bud</span></div>
      <div className="mt-3 rounded-lg bg-slate-50 p-2.5">
        <div className="flex justify-between text-[10px] text-slate-500"><span>Dit bud</span><span>Udbudspris</span></div>
        <div className="relative mt-2 h-2 rounded-full bg-slate-200">
          <span className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: "62%" }} />
          <span className="absolute -top-1 h-4 w-1 rounded bg-[#0b1b33]" style={{ left: "78%" }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] tabular-nums"><span className="font-semibold text-emerald-700">1.090.000</span><span className="font-semibold">Dit maks: 1.120.000</span><span>1.150.000</span></div>
        <p className="mt-1.5 text-[10px] text-slate-500">Ved dit maks er overskuddet stadig 1.500 kr./md.</p>
      </div>
      <div className="mt-2 space-y-0">
        {[["8. okt.", "Bud afgivet", "1.060.000 kr.", "text-slate-700"], ["9. okt.", "Modbud fra sælger", "1.110.000 kr.", "text-orange-700"], ["10. okt.", "Nyt bud", "1.090.000 kr.", "text-slate-700"], ["I dag", "Accepteret", "1.090.000 kr.", "text-emerald-700"]].map(([d, t, v, c], i) => (
          <div key={t} className="flex items-center gap-2.5 py-1">
            <span className="flex flex-col items-center self-stretch"><span className={cx("h-2.5 w-2.5 rounded-full border-2", i === 3 ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white")} />{i < 3 && <span className="w-px flex-1 bg-slate-200" />}</span>
            <span className="w-11 shrink-0 text-[10px] text-slate-400">{d}</span>
            <span className="flex-1 text-[11px] font-medium">{t}</span>
            <span className={cx("text-[11px] font-semibold tabular-nums", c)}>{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{["Advokatforbehold", "Finansieringsforbehold"].map((f) => <span key={f} className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"><Check size={10} />{f}</span>)}</div>
    </AppFrame>
  );
}

/* ---------- Pipeline (CRM) ---------- */
export function PipelineScreen() {
  const cols = [
    { l: "Screening", bar: "bg-slate-400", sum: "4,8 mio.", cards: [[1, "Søndergade 14", "Aarhus C", "2.495.000", "+1.850", "Ring til mægler"], [4, "Vesterbro 88", "Aalborg", "1.395.000", "+640", ""]] },
    { l: "Fremvisning", bar: "bg-sky-500", sum: "1,2 mio.", cards: [[9, "Algade 9", "Holstebro", "1.150.000", "+2.120", "Tirs. 16.00"]] },
    { l: "Papirer", bar: "bg-amber-400", sum: "2,1 mio.", cards: [[7, "Nørregade 41", "Odense C", "2.100.000", "+940", "2 risici"]] },
    { l: "Bank", bar: "bg-indigo-500", sum: "1,3 mio.", cards: [[5, "Kongensgade 7", "Esbjerg", "1.295.000", "+3.020", "Tors. 09.00"]] },
    { l: "Bud", bar: "bg-orange-500", sum: "1,5 mio.", cards: [[6, "Torvet 2", "Viborg", "1.450.000", "+2.780", "Modbud i dag"]] },
  ] as const;
  return (
    <AppFrame active={1}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[15px] font-semibold">Ejendomme</p>
        <span className="text-[11px] text-slate-500">6 boliger · 10,9 mio. kr. i pipeline</span>
        <span className="ml-auto flex rounded-md bg-slate-100 p-0.5 text-[10px] font-semibold"><span className="rounded bg-white px-2 py-0.5 shadow-sm">Tavle</span><span className="px-2 py-0.5 text-slate-500">Liste</span></span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-5">
        {cols.map((c, ci) => (
          <div key={c.l} className={cx("min-w-0 rounded-lg bg-slate-100/80 p-1.5", ci > 2 && "hidden xl:block")}>
            <div className={cx("h-[3px] rounded-full", c.bar)} />
            <div className="flex items-baseline justify-between px-0.5 pb-1.5 pt-1.5"><span className="truncate text-[11px] font-semibold">{c.l}</span><span className="text-[9px] tabular-nums text-slate-500">{c.sum}</span></div>
            <div className="space-y-1.5">
              {c.cards.map(([n, a, city, p, cf, next]) => (
                <div key={a} className="overflow-hidden rounded-md bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
                  <Thumb n={n} className="h-12 w-full rounded-none" />
                  <div className="p-1.5">
                    <p className="truncate text-[11px] font-semibold">{a}</p>
                    <p className="truncate text-[9px] text-slate-500">{city} · {p} kr.</p>
                    <div className="mt-1 flex items-center justify-between gap-1"><Pill v={`${cf}`} />{next && <span className="truncate text-[9px] font-medium text-blue-600">{next}</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppFrame>
  );
}

/* ---------- Kalender ---------- */
export function CalendarScreen() {
  const days = [["Man", "12"], ["Tir", "13"], ["Ons", "14"], ["Tor", "15"], ["Fre", "16"]];
  const ev: Record<number, [string, string, string, number][]> = {
    0: [["12.00", "Svar på modbud", "Torvet 2", 0]],
    1: [["16.00", "Fremvisning", "Algade 9", 1]],
    2: [["10.00", "Ring til mægler", "Søndergade 14", 2]],
    3: [["09.00", "Bankmøde", "Kongensgade 7", 3], ["14.00", "Købers rådgiver", "Torvet 2", 0]],
    4: [],
  };
  const tone = ["bg-orange-50 border-orange-400 text-orange-900", "bg-sky-50 border-sky-500 text-sky-900", "bg-slate-50 border-slate-400 text-slate-800", "bg-indigo-50 border-indigo-500 text-indigo-900"];
  return (
    <AppFrame active={5}>
      <div className="flex items-center justify-between"><div><p className="text-[15px] font-semibold">Opgaver</p><p className="text-[10px] text-slate-500">Uge 42 · 12.-16. oktober</p></div><span className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2 text-[10px] font-semibold text-white"><Plus size={11} /> Ny opgave</span></div>
      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {days.map(([d, n], i) => (
          <div key={d} className="min-w-0">
            <p className={cx("text-center text-[10px]", i === 0 ? "font-semibold text-blue-600" : "text-slate-500")}>{d} <span className={cx("ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full tabular-nums", i === 0 && "bg-blue-600 text-white")}>{n}</span></p>
            <div className="mt-1.5 min-h-[120px] space-y-1 rounded-md bg-slate-50 p-1">
              {ev[i].map(([t, title, a, k]) => (
                <div key={title + t} className={cx("rounded border-l-2 px-1.5 py-1", tone[k])}>
                  <p className="text-[9px] tabular-nums opacity-70">{t}</p>
                  <p className="truncate text-[10px] font-semibold">{title}</p>
                  <p className="truncate text-[9px] opacity-70">{a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppFrame>
  );
}

/* ---------- Bankrapport ---------- */
export function BankScreen() {
  return (
    <div className="rounded-[18px] bg-slate-200/70 p-4 text-slate-900 shadow-[0_40px_100px_-40px_rgba(11,27,51,0.55)] sm:p-6">
      <div className="mx-auto max-w-[420px] rounded-md bg-white p-5 shadow-[0_8px_30px_-10px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5"><span className="text-[12px] font-semibold">NordInvest</span><span className="text-[10px] text-slate-500">Budget til banken · 12. okt. 2026</span></div>
        <p className="mt-3 text-[15px] font-semibold">Algade 9, 7500 Holstebro</p>
        <p className="text-[10px] text-slate-500">Ejerlejlighed · 78 m² · købesum 1.090.000 kr.</p>
        <table className="mt-3 w-full text-[11px] tabular-nums">
          <tbody className="divide-y divide-slate-100">
            {[["Egen udbetaling", "218.000 kr."], ["Realkreditlån", "872.000 kr."], ["Husleje pr. md.", "8.900 kr."], ["Lån og udgifter pr. md.", "6.780 kr."], ["Overskud pr. md.", "+2.120 kr."], ["Holder til rente op til", "7,1 %"]].map(([l, v], i) => (
              <tr key={l}><td className="py-1.5 text-slate-600">{l}</td><td className={cx("py-1.5 text-right font-semibold", i === 4 && "text-emerald-700")}>{v}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 rounded bg-slate-50 p-2 text-[10px] leading-snug text-slate-600">Kilder: BBR, Danmarks Statistik, solgte boliger i 7500 og sammenlignelige lejemål.</div>
      </div>
    </div>
  );
}
