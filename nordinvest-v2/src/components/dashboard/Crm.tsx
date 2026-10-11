"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, FileText, Gavel, GripVertical, Plus } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { EMPTY_MAPPE, OFFER_STATUS, STAGES, STAGE_LABEL, daysUntil, fmtDue, type Mappe, type Stage, type Task } from "@/lib/mappe/checklist";
import { saveMappe } from "@/lib/mappe/save";

/*
 * The investor's CRM: every saved property as a card in a pipeline that
 * follows the buying process (screening → viewing → documents → bank → offer
 * → bought), with the next tasks across all properties on top. Cards drag
 * between stages on desktop and move with a select on phones; every change
 * is saved on the property's own mappe.
 */

export type CrmRow = {
  id: string;
  created_at: string;
  investment_score: number | null;
  property_url: string | null;
  property_data: (Record<string, unknown> & { address?: string; price?: number; mappe?: Mappe }) | null;
  analysis_result: { cashFlow?: number } | null;
};

type Col = Stage | "droppet";
const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const short = (a: string) => a.split(",")[0];
const city = (a: string) => a.split(",").slice(1).join(",").trim();

export function Crm({ initial }: { initial: CrmRow[] }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<Col>("screening");
  const [showDropped, setShowDropped] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Col | null>(null);

  const mappeOf = (r: CrmRow): Mappe => ({ ...EMPTY_MAPPE, ...(r.property_data?.mappe ?? {}) });
  // Update one card and save it. Built from the latest rows (a ref), and the
  // save happens outside the state updater so it runs exactly once.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const update = (id: string, fn: (m: Mappe) => Mappe) => {
    const r = rowsRef.current.find((x) => x.id === id);
    if (!r) return;
    const next = fn(mappeOf(r));
    const updated = { ...r, property_data: { ...(r.property_data ?? {}), mappe: next } };
    rowsRef.current = rowsRef.current.map((x) => (x.id === id ? updated : x));
    setRows(rowsRef.current);
    void saveMappe(r.id, r.property_data ?? {}, next);
  };
  const move = (id: string, stage: Col) => update(id, (m) => ({ ...m, stage }));

  const byStage = useMemo(() => {
    const out: Record<Col, CrmRow[]> = { screening: [], fremvisning: [], dokumenter: [], bank: [], bud: [], koebt: [], droppet: [] };
    for (const r of rows) out[mappeOf(r).stage]?.push(r);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const tasks = useMemo(() => rows.flatMap((r) => (mappeOf(r).tasks ?? []).filter((t) => !t.done && mappeOf(r).stage !== "droppet").map((t) => ({ t, r })))
    .sort((a, b) => (a.t.due ?? "9999").localeCompare(b.t.due ?? "9999")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]);

  const active = rows.filter((r) => !["droppet", "koebt"].includes(mappeOf(r).stage)).length;
  const viewings = tasks.filter(({ t }) => t.kind === "fremvisning").length;
  const offers = rows.filter((r) => ["afgivet", "modbud"].includes(mappeOf(r).offer?.status ?? "")).length;
  const bought = byStage.koebt.length;
  const cols: Col[] = [...STAGES.map((s) => s.id), ...(showDropped ? (["droppet"] as Col[]) : [])];

  return (
    <div>
      {/* Pipeline figures */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Fig label="Boliger i gang" value={active} hint={`${rows.length} gemt i alt`} />
        <Fig label="Fremvisninger planlagt" value={viewings} hint="kommende" />
        <Fig label="Bud ude" value={offers} hint="afgivet eller modbud" tone={offers ? "blue" : undefined} />
        <Fig label="Købt" value={bought} hint={bought ? "tillykke" : "endnu"} tone={bought ? "green" : undefined} />
      </div>

      {/* Next tasks */}
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <h2 className="flex items-center gap-2 text-[18px] font-semibold text-slate-900"><CalendarClock size={19} strokeWidth={1.8} className="text-slate-500" /> Næste opgaver</h2>
        {tasks.length === 0 ? (
          <p className="mt-2 text-[15px] text-slate-600">Ingen opgaver lige nu. Åbn en bolig og tilføj fx en fremvisning, et opkald til mægleren eller et bankmøde.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {tasks.slice(0, 6).map(({ t, r }) => <TaskRow key={`${r.id}-${t.id}`} t={t} r={r} onDone={() => update(r.id, (m) => ({ ...m, tasks: (m.tasks ?? []).map((x) => (x.id === t.id ? { ...x, done: true } : x)) }))} />)}
          </ul>
        )}
      </section>

      {/* Pipeline */}
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-slate-900">Pipeline</h2>
            <p className="text-[15px] text-slate-600">Træk en bolig videre, når du er klar til næste skridt.</p>
          </div>
          <div className="flex items-center gap-3">
            {byStage.droppet.length > 0 && (
              <button type="button" onClick={() => setShowDropped((v) => !v)} className="min-h-[40px] text-[14px] font-medium text-slate-500 hover:text-slate-900">
                {showDropped ? "Skjul droppede" : `Vis droppede (${byStage.droppet.length})`}
              </button>
            )}
            <Link href="/analyseren/start" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[15px] font-semibold text-white shadow-btn hover:bg-slate-800"><Plus size={16} /> Tilføj bolig</Link>
          </div>
        </div>

        {/* Phones: one stage at a time */}
        <div className="mt-4 lg:hidden">
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
            <div className="flex min-w-max gap-1.5">
              {cols.map((c) => (
                <button key={c} type="button" onClick={() => setTab(c)} aria-pressed={tab === c}
                  className={clsx("flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-[15px] font-semibold", tab === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700")}>
                  {STAGE_LABEL[c]} <span className={clsx("rounded-full px-1.5 text-[12px]", tab === c ? "bg-white/15" : "bg-slate-100 text-slate-600")}>{byStage[c].length}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {byStage[tab].length === 0 ? <Empty stage={tab} /> : byStage[tab].map((r) => <Card key={r.id} r={r} m={mappeOf(r)} onMove={(s) => move(r.id, s)} />)}
          </div>
        </div>

        {/* Desktop: the board */}
        <div className="mt-4 hidden gap-3 overflow-x-auto pb-2 lg:grid" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(${cols.length > 6 ? 168 : 0}px, 1fr))` }}>
          {cols.map((c) => (
            <div key={c}
              onDragOver={(e) => { e.preventDefault(); setOverCol(c); }}
              onDragLeave={() => setOverCol((o) => (o === c ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, c); setDragId(null); setOverCol(null); }}
              className={clsx("flex min-h-[260px] min-w-0 flex-col rounded-2xl border p-2 transition-colors", overCol === c && dragId ? "border-blue-400 bg-blue-50/60" : "border-slate-200 bg-slate-100/70")}>
              <div className="flex items-center justify-between px-1.5 pb-2 pt-1">
                <span className="text-[14px] font-semibold text-slate-800">{STAGE_LABEL[c]}</span>
                <span className="rounded-full bg-white px-2 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200">{byStage[c].length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {byStage[c].map((r) => (
                  <div key={r.id} draggable onDragStart={() => setDragId(r.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }} className={clsx(dragId === r.id && "opacity-50")}>
                    <Card r={r} m={mappeOf(r)} compact onMove={(s) => move(r.id, s)} />
                  </div>
                ))}
                {byStage[c].length === 0 && <p className="px-1.5 py-6 text-center text-[13px] text-slate-400">Træk en bolig hertil</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Fig({ label, value, hint, tone }: { label: string; value: number; hint: string; tone?: "blue" | "green" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <p className="text-[14px] font-medium text-slate-600">{label}</p>
      <p className={clsx("mt-1 text-[30px] font-semibold leading-none tabular-nums tracking-[-0.02em]", tone === "blue" ? "text-blue-700" : tone === "green" ? "text-emerald-700" : "text-slate-900")}>{value}</p>
      <p className="mt-1.5 text-[13px] text-slate-500">{hint}</p>
    </div>
  );
}

function TaskRow({ t, r, onDone }: { t: Task; r: CrmRow; onDone: () => void }) {
  const dd = t.due ? daysUntil(t.due) : null;
  const addr = r.property_data?.address || r.property_url || "Ejendom";
  return (
    <li className="flex items-center gap-3 py-3">
      <button type="button" role="checkbox" aria-checked={false} aria-label={`Marker ${t.title} som klaret`} onClick={onDone} className="group -m-2 flex h-10 w-10 shrink-0 items-center justify-center"><span className="h-6 w-6 rounded-full border-2 border-slate-300 group-hover:border-emerald-500" /></button>
      <Link href={`/mappe/${r.id}`} className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-slate-900">{t.title}</p>
        <p className="truncate text-[13px] text-slate-500">
          <span className={clsx(dd != null && dd < 0 ? "font-semibold text-rose-600" : dd === 0 ? "font-semibold text-blue-700" : "")}>
            {t.due ? `${dd! < 0 ? "Overskredet · " : dd === 0 ? "I dag · " : dd === 1 ? "I morgen · " : ""}${fmtDue(t.due)}` : "Ingen dato"}
          </span>
          {" · "}{short(addr)}
        </p>
      </Link>
    </li>
  );
}

function Card({ r, m, compact, onMove }: { r: CrmRow; m: Mappe; compact?: boolean; onMove: (s: Col) => void }) {
  const addr = r.property_data?.address || r.property_url || "Ejendom";
  const price = Number(r.property_data?.price) || 0;
  const cf = r.analysis_result?.cashFlow;
  const next = (m.tasks ?? []).filter((t) => !t.done && t.due).sort((a, b) => a.due!.localeCompare(b.due!))[0];
  const flags = m.docs.reduce((n, d) => n + d.risks.filter((x) => x.level === "hoej").length, 0);
  return (
    <div className={clsx("rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-card", compact ? "p-2.5" : "p-3.5")}>
      <div className="flex items-start gap-2">
        {compact && <GripVertical aria-hidden size={15} className="mt-0.5 shrink-0 cursor-grab text-slate-300" />}
        <Link href={`/mappe/${r.id}`} className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-slate-900">{short(addr)}</p>
          {city(addr) && <p className="truncate text-[13px] text-slate-500">{city(addr)}</p>}
          <p className="mt-1.5 flex flex-wrap gap-x-2 text-[14px] tabular-nums">
            {price > 0 && <span className="text-slate-800">{kr(price)}</span>}
            {cf != null && <span className={cf >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-600"}>{cf >= 0 ? "+" : "−"}{kr(Math.abs(cf))}/md.</span>}
          </p>
        </Link>
      </div>
      {(next || m.docs.length > 0 || flags > 0 || m.offer) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[12px] font-semibold">
          {next && <span className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-1", daysUntil(next.due!) < 0 ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-800")}><CalendarClock size={12} /> {fmtDue(next.due!)}</span>}
          {m.offer && <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-1.5 py-1 text-white"><Gavel size={12} /> {OFFER_STATUS[m.offer.status]}</span>}
          {m.docs.length > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-1 text-slate-700"><FileText size={12} /> {m.docs.length}</span>}
          {flags > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-1 text-rose-700"><AlertTriangle size={12} /> {flags}</span>}
        </div>
      )}
      <label className={clsx("mt-2.5 items-center gap-2 border-t border-slate-100 pt-2.5 text-[13px] text-slate-500", compact ? "hidden" : "flex")}>
        <span className="shrink-0">Fase</span>
        <select value={m.stage} onChange={(e) => onMove(e.target.value as Col)} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[14px] font-medium text-slate-800">
          {(["screening", "fremvisning", "dokumenter", "bank", "bud", "koebt", "droppet"] as Col[]).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      </label>
    </div>
  );
}

function Empty({ stage }: { stage: Col }) {
  const text: Record<Col, string> = {
    screening: "Gem en analyseret bolig, så starter den her.",
    fremvisning: "Ingen boliger, du skal se lige nu.",
    dokumenter: "Ingen boliger, hvor du læser papirer.",
    bank: "Ingen boliger hos banken lige nu.",
    bud: "Ingen bud ude lige nu.",
    koebt: "Her lander dine køb.",
    droppet: "Ingen droppede boliger.",
  };
  return <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-[15px] text-slate-500">{text[stage]}</p>;
}
