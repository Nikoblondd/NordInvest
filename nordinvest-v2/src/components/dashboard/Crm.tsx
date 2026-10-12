"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, Columns3, FileText, Home, List, Plus } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { EMPTY_MAPPE, STAGES, STAGE_LABEL, daysUntil, fmtDue, type Mappe, type Stage, type Task } from "@/lib/mappe/checklist";
import { saveMappe } from "@/lib/mappe/save";

/*
 * "Mine ejendomme": a plain CRM in the shape people know from HubSpot and
 * Monday. Every saved property is a deal in a pipeline that follows the
 * Danish buying process. Desktop shows a board (drag cards between stages)
 * or a list; phones show the list grouped by stage, with the stage as a
 * coloured pill you tap to change. A second tab holds the to-dos across all
 * properties. Every change is saved on the property's own mappe.
 */

export type CrmRow = {
  id: string;
  created_at: string;
  investment_score: number | null;
  property_url: string | null;
  property_data: (Record<string, unknown> & { address?: string; price?: number; image?: string; mappe?: Mappe }) | null;
  analysis_result: { cashFlow?: number } | null;
};

type Col = Stage | "droppet";
const ALL: Col[] = ["screening", "fremvisning", "dokumenter", "bank", "bud", "koebt", "droppet"];

/** One colour per stage, used for the pill, the column top and the thumbnail. */
const TONE: Record<Col, { pill: string; bar: string; soft: string }> = {
  screening: { pill: "bg-slate-600 text-white", bar: "bg-slate-500", soft: "bg-slate-100 text-slate-500" },
  fremvisning: { pill: "bg-sky-600 text-white", bar: "bg-sky-500", soft: "bg-sky-50 text-sky-600" },
  dokumenter: { pill: "bg-amber-400 text-amber-950", bar: "bg-amber-400", soft: "bg-amber-50 text-amber-600" },
  bank: { pill: "bg-indigo-600 text-white", bar: "bg-indigo-500", soft: "bg-indigo-50 text-indigo-600" },
  bud: { pill: "bg-orange-600 text-white", bar: "bg-orange-500", soft: "bg-orange-50 text-orange-600" },
  koebt: { pill: "bg-emerald-600 text-white", bar: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-600" },
  droppet: { pill: "bg-slate-300 text-slate-700", bar: "bg-slate-300", soft: "bg-slate-100 text-slate-400" },
};

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const street = (a: string) => a.split(",")[0];
const city = (a: string) => a.split(",").slice(1).join(",").trim();
const addrOf = (r: CrmRow) => r.property_data?.address || r.property_url || "Bolig";

export function Crm({ initial }: { initial: CrmRow[]; firstName?: string }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<"pipeline" | "opgaver">("pipeline");
  const [view, setView] = useState<"tavle" | "liste">("tavle");
  const [showDropped, setShowDropped] = useState(false);

  // Remember the board/list choice on this device.
  useEffect(() => {
    try { const v = localStorage.getItem("ni_crm_view"); if (v === "liste" || v === "tavle") setView(v); } catch {}
  }, []);
  const pickView = (v: "tavle" | "liste") => { setView(v); try { localStorage.setItem("ni_crm_view", v); } catch {} };

  const mappeOf = (r: CrmRow): Mappe => ({ ...EMPTY_MAPPE, ...(r.property_data?.mappe ?? {}) });
  // Update one property and save it. Built from the latest rows (a ref) and
  // saved outside the state updater, so it runs exactly once.
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
    const out = Object.fromEntries(ALL.map((c) => [c, [] as CrmRow[]])) as Record<Col, CrmRow[]>;
    for (const r of rows) out[mappeOf(r).stage]?.push(r);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const tasks = useMemo(
    () => rows.filter((r) => mappeOf(r).stage !== "droppet")
      .flatMap((r) => (mappeOf(r).tasks ?? []).filter((t) => !t.done).map((t) => ({ t, r })))
      .sort((a, b) => (a.t.due ?? "9999").localeCompare(b.t.due ?? "9999")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  );

  const active = rows.filter((r) => !["droppet", "koebt"].includes(mappeOf(r).stage)).length;
  const offers = byStage.bud.length;
  const thisWeek = tasks.filter(({ t }) => t.due && daysUntil(t.due) <= 7).length;
  const cols: Col[] = [...STAGES.map((s) => s.id), ...(showDropped ? (["droppet"] as Col[]) : [])];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[30px]">Ejendomme</h1>
          <p className="mt-1 text-[15px] text-slate-500">
            {rows.length === 0 ? "Her samler du de boliger, du overvejer at købe." : `${active} i gang, ${offers} med bud og ${thisWeek} ${thisWeek === 1 ? "opgave" : "opgaver"} de næste 7 dage.`}
          </p>
        </div>
        <Link href="/app/analyser" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 active:translate-y-px">
          <Plus size={17} /> Tilføj bolig
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyBoard />
      ) : (
        <>
          {/* Toolbar: tabs left, view switch right */}
          <div className="mt-6 flex items-center justify-between gap-3 border-b border-slate-200">
            <div className="flex gap-1" role="tablist">
              <TabBtn on={tab === "pipeline"} onClick={() => setTab("pipeline")}>Pipeline <Count n={rows.length - byStage.droppet.length} /></TabBtn>
              <TabBtn on={tab === "opgaver"} onClick={() => setTab("opgaver")}>Opgaver <Count n={tasks.length} /></TabBtn>
            </div>
            {tab === "pipeline" && (
              <div className="flex items-center gap-2 pb-2">
                {byStage.droppet.length > 0 && (
                  <button type="button" onClick={() => setShowDropped((v) => !v)} className="hidden min-h-[36px] px-2 text-[14px] font-medium text-slate-500 hover:text-slate-900 sm:block">
                    {showDropped ? "Skjul droppede" : `Droppede (${byStage.droppet.length})`}
                  </button>
                )}
                <div className="hidden rounded-lg bg-slate-100 p-0.5 lg:flex">
                  <ViewBtn on={view === "tavle"} onClick={() => pickView("tavle")} label="Tavle"><Columns3 size={16} /></ViewBtn>
                  <ViewBtn on={view === "liste"} onClick={() => pickView("liste")} label="Liste"><List size={16} /></ViewBtn>
                </div>
              </div>
            )}
          </div>

          {tab === "pipeline" ? (
            <>
              {/* Desktop board */}
              {view === "tavle" && <Board cols={cols} byStage={byStage} mappeOf={mappeOf} onMove={move} />}
              {/* List: always on phones, on desktop when chosen */}
              <div className={clsx("mt-5", view === "tavle" && "lg:hidden")}>
                <ListView cols={cols} byStage={byStage} mappeOf={mappeOf} onMove={move} />
                {byStage.droppet.length > 0 && (
                  <button type="button" onClick={() => setShowDropped((v) => !v)} className="mt-4 min-h-[44px] text-[15px] font-medium text-slate-500 sm:hidden">
                    {showDropped ? "Skjul droppede" : `Vis droppede (${byStage.droppet.length})`}
                  </button>
                )}
              </div>
            </>
          ) : (
            <Tasks rows={rows.filter((r) => mappeOf(r).stage !== "droppet")} tasks={tasks} update={update} />
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="tab" aria-selected={on} onClick={onClick}
      className={clsx("-mb-px flex min-h-[44px] items-center gap-2 border-b-2 px-3 text-[15px] font-semibold transition-colors", on ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800")}>
      {children}
    </button>
  );
}
const Count = ({ n }: { n: number }) => <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-slate-600">{n}</span>;
function ViewBtn({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={clsx("flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold transition-colors", on ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
      {children} {label}
    </button>
  );
}

/** The stage as a coloured pill that is also the control to change it. */
function StagePill({ stage, onChange, label }: { stage: Col; onChange: (s: Col) => void; label: string }) {
  return (
    <span className={clsx("relative inline-flex h-8 min-w-[7.5rem] shrink-0 items-center rounded-md pl-2.5 pr-7 text-[13px] font-semibold", TONE[stage].pill)}>
      {STAGE_LABEL[stage]}
      <ChevronDown size={14} className="pointer-events-none absolute right-2 opacity-80" />
      <select aria-label={`Fase for ${label}`} value={stage} onChange={(e) => onChange(e.target.value as Col)} className="absolute inset-0 cursor-pointer opacity-0">
        {ALL.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
      </select>
    </span>
  );
}

function Thumb({ r, stage, size = 44 }: { r: CrmRow; stage: Col; size?: number }) {
  const img = typeof r.property_data?.image === "string" ? r.property_data.image : null;
  const [broken, setBroken] = useState(false);
  return (
    <span className={clsx("flex shrink-0 items-center justify-center overflow-hidden rounded-lg", TONE[stage].soft)} style={{ width: size, height: size }}>
      {img && !broken
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={img} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        : <Home size={Math.round(size * 0.45)} strokeWidth={1.8} />}
    </span>
  );
}

function CashFlow({ v }: { v: number | undefined }) {
  if (v == null || !Number.isFinite(v)) return null;
  return (
    <span className={clsx("whitespace-nowrap rounded px-1.5 py-0.5 text-[12px] font-semibold tabular-nums", v >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
      {v >= 0 ? "+" : "-"}{Math.round(Math.abs(v)).toLocaleString("da-DK")} kr./md.
    </span>
  );
}

const nextTask = (m: Mappe) => (m.tasks ?? []).filter((t) => !t.done && t.due).sort((a, b) => a.due!.localeCompare(b.due!))[0];

function DueChip({ t }: { t: Task }) {
  const d = daysUntil(t.due!);
  return (
    <span className={clsx("inline-flex min-w-0 items-center gap-1 text-[12px] font-medium", d < 0 ? "text-rose-600" : d <= 1 ? "text-blue-700" : "text-slate-500")}>
      <CalendarDays size={13} className="shrink-0" />
      <span className="truncate">{d < 0 ? "Overskredet: " : d === 0 ? "I dag: " : d === 1 ? "I morgen: " : ""}{t.title}</span>
    </span>
  );
}

/* ---------- Board (desktop) ---------- */

type ViewProps = { cols: Col[]; byStage: Record<Col, CrmRow[]>; mappeOf: (r: CrmRow) => Mappe; onMove: (id: string, s: Col) => void };

function Board({ cols, byStage, mappeOf, onMove }: ViewProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Col | null>(null);
  return (
    <div className="mt-5 hidden gap-3 overflow-x-auto pb-3 lg:grid" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(200px, 1fr))` }}>
      {cols.map((c) => (
        <div key={c}
          onDragOver={(e) => { e.preventDefault(); setOver(c); }}
          onDragLeave={() => setOver((o) => (o === c ? null : o))}
          onDrop={(e) => { e.preventDefault(); if (dragId) onMove(dragId, c); setDragId(null); setOver(null); }}
          className={clsx("flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-xl transition-colors", over === c && dragId ? "bg-blue-50 ring-2 ring-blue-300" : "bg-slate-100")}>
          <div className={clsx("h-1", TONE[c].bar)} />
          <div className="flex items-center justify-between px-3 pb-2 pt-2.5">
            <span className="text-[14px] font-semibold text-slate-800">{STAGE_LABEL[c]}</span>
            <span className="text-[13px] font-semibold tabular-nums text-slate-500">{byStage[c].length}</span>
          </div>
          <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
            {byStage[c].map((r) => {
              const m = mappeOf(r);
              const addr = addrOf(r);
              const price = Number(r.property_data?.price) || 0;
              const nt = nextTask(m);
              return (
                <Link key={r.id} href={`/app/ejendomme/${r.id}`} draggable
                  onDragStart={() => setDragId(r.id)} onDragEnd={() => { setDragId(null); setOver(null); }}
                  className={clsx("block cursor-grab rounded-lg border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-shadow hover:border-slate-300 hover:shadow-md active:cursor-grabbing", dragId === r.id && "opacity-40")}>
                  <div className="flex items-start gap-2.5">
                    <Thumb r={r} stage={c} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-slate-900">{street(addr)}</p>
                      <p className="truncate text-[12px] text-slate-500">{city(addr) || "Uden by"}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-[13px] font-semibold tabular-nums text-slate-800">{price > 0 ? kr(price) : "Ingen pris"}</span>
                    <CashFlow v={r.analysis_result?.cashFlow} />
                  </div>
                  {(nt || m.docs.length > 0) && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      {nt ? <DueChip t={nt} /> : <span />}
                      {m.docs.length > 0 && <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-slate-500"><FileText size={13} /> {m.docs.length}</span>}
                    </div>
                  )}
                </Link>
              );
            })}
            {byStage[c].length === 0 && <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 px-2 py-8 text-center text-[13px] text-slate-400">Træk en bolig hertil</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- List (phones, and desktop when chosen) ---------- */

function ListView({ cols, byStage, mappeOf, onMove }: ViewProps) {
  return (
    <div className="space-y-6">
      {cols.filter((c) => byStage[c].length > 0).map((c) => (
        <section key={c}>
          <h2 className="flex items-center gap-2 pb-2 text-[15px] font-semibold text-slate-900">
            <span className={clsx("h-4 w-1 rounded-full", TONE[c].bar)} aria-hidden /> {STAGE_LABEL[c]}
            <span className="text-[14px] font-medium tabular-nums text-slate-400">{byStage[c].length}</span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* Column titles on desktop */}
            <div className="hidden grid-cols-[minmax(0,2.2fr)_150px_130px_130px_minmax(0,1.6fr)] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[12px] font-semibold text-slate-500 lg:grid">
              <span>Bolig</span><span>Fase</span><span>Pris</span><span>Cash flow</span><span>Næste opgave</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {byStage[c].map((r) => {
                const m = mappeOf(r);
                const addr = addrOf(r);
                const price = Number(r.property_data?.price) || 0;
                const nt = nextTask(m);
                return (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-3 lg:grid lg:grid-cols-[minmax(0,2.2fr)_150px_130px_130px_minmax(0,1.6fr)] lg:gap-4 lg:px-4">
                    <Link href={`/app/ejendomme/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Thumb r={r} stage={c} />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-slate-900 hover:text-blue-700">{street(addr)}</span>
                        <span className="block truncate text-[13px] text-slate-500 lg:hidden">{price > 0 ? kr(price) : city(addr)}</span>
                        <span className="hidden truncate text-[13px] text-slate-500 lg:block">{city(addr)}</span>
                        <span className="mt-1 block lg:hidden"><CashFlow v={r.analysis_result?.cashFlow} /></span>
                      </span>
                    </Link>
                    <StagePill stage={c} onChange={(s) => onMove(r.id, s)} label={street(addr)} />
                    <span className="hidden text-[14px] tabular-nums text-slate-800 lg:block">{price > 0 ? kr(price) : "-"}</span>
                    <span className="hidden lg:block"><CashFlow v={r.analysis_result?.cashFlow} /></span>
                    <span className="hidden min-w-0 lg:block">{nt ? <DueChip t={nt} /> : <span className="text-[13px] text-slate-400">Ingen</span>}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------- Tasks ---------- */

export function Tasks({ rows, tasks, update }: { rows: CrmRow[]; tasks: { t: Task; r: CrmRow }[]; update: (id: string, fn: (m: Mappe) => Mappe) => void }) {
  const [title, setTitle] = useState("");
  const [rowId, setRowId] = useState(rows[0]?.id ?? "");
  const [due, setDue] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rowId) return;
    const kind = /fremvis/i.test(title) ? "fremvisning" : /bank/i.test(title) ? "bank" : /mægler|maegler/i.test(title) ? "maegler" : /bud/i.test(title) ? "bud" : "andet";
    update(rowId, (m) => ({ ...m, tasks: [...(m.tasks ?? []), { id: `t${Date.now()}`, kind, title: title.trim(), due: due || null, done: false }] }));
    setTitle("");
    setDue("");
  };
  const done = (rid: string, tid: string) => update(rid, (m) => ({ ...m, tasks: (m.tasks ?? []).map((x) => (x.id === tid ? { ...x, done: true } : x)) }));

  const groups: { label: string; items: typeof tasks; tone?: string }[] = [
    { label: "Overskredet", items: tasks.filter(({ t }) => t.due && daysUntil(t.due) < 0), tone: "text-rose-600" },
    { label: "I dag", items: tasks.filter(({ t }) => t.due && daysUntil(t.due) === 0), tone: "text-blue-700" },
    { label: "Næste 7 dage", items: tasks.filter(({ t }) => t.due && daysUntil(t.due) > 0 && daysUntil(t.due) <= 7) },
    { label: "Senere", items: tasks.filter(({ t }) => t.due && daysUntil(t.due) > 7) },
    { label: "Uden dato", items: tasks.filter(({ t }) => !t.due) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mt-5 max-w-3xl">
      <form onSubmit={add} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_180px_190px_auto]">
        <label className="sr-only" htmlFor="crm-task">Ny opgave</label>
        <input id="crm-task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ny opgave, fx Fremvisning" className="h-11 min-w-0 rounded-lg border border-slate-200 px-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
        <label className="sr-only" htmlFor="crm-task-row">Bolig</label>
        <select id="crm-task-row" value={rowId} onChange={(e) => setRowId(e.target.value)} className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[15px] text-slate-800">
          {rows.map((r) => <option key={r.id} value={r.id}>{street(addrOf(r))}</option>)}
        </select>
        <label className="sr-only" htmlFor="crm-task-due">Dato</label>
        <input id="crm-task-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[15px] text-slate-800" />
        <button type="submit" disabled={!title.trim() || !rowId} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-[15px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
          <Plus size={16} /> Tilføj
        </button>
      </form>

      {groups.length === 0 ? (
        <p className="mt-8 text-center text-[15px] text-slate-500">Ingen opgaver. Skriv den første ovenfor, fx en fremvisning eller et bankmøde.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h3 className={clsx("pb-2 text-[14px] font-semibold", g.tone ?? "text-slate-900")}>{g.label} <span className="font-medium text-slate-400">{g.items.length}</span></h3>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {g.items.map(({ t, r }) => (
                  <li key={`${r.id}-${t.id}`} className="flex items-center gap-2 px-2 py-1.5 sm:px-3">
                    <button type="button" role="checkbox" aria-checked={false} aria-label={`Marker ${t.title} som klaret`} onClick={() => done(r.id, t.id)}
                      className="group flex h-11 w-11 shrink-0 items-center justify-center">
                      <span className="h-5 w-5 rounded-full border-2 border-slate-300 transition-colors group-hover:border-emerald-500 group-hover:bg-emerald-50" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-slate-900">{t.title}</p>
                      <Link href={`/app/ejendomme/${r.id}`} className="block truncate text-[13px] text-slate-500 hover:text-blue-700">{street(addrOf(r))}{t.due && <span className="sm:hidden">, {fmtDue(t.due)}</span>}</Link>
                    </div>
                    {t.due && <span className="hidden shrink-0 pr-1 text-right text-[13px] tabular-nums text-slate-600 sm:block">{fmtDue(t.due)}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Empty ---------- */

function EmptyBoard() {
  return (
    <div className="relative mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Ghost board: what it will look like */}
      <div aria-hidden className="grid grid-cols-3 gap-2 p-3 opacity-60 sm:grid-cols-6">
        {STAGES.map((s, i) => (
          <div key={s.id} className={clsx("overflow-hidden rounded-lg bg-slate-100", i > 2 && "hidden sm:block")}>
            <div className={clsx("h-1", TONE[s.id].bar)} />
            <p className="px-2 pt-2 text-[12px] font-semibold text-slate-500">{s.label}</p>
            <div className="space-y-1.5 p-2">
              {Array.from({ length: i === 0 ? 2 : i < 3 ? 1 : 0 }).map((_, k) => <div key={k} className="h-12 rounded-md bg-white" />)}
              <div className="h-12 rounded-md border border-dashed border-slate-300" />
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-5 py-8 text-center sm:py-10">
        <h2 className="text-[20px] font-semibold text-slate-900">Ingen boliger endnu</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[15px] text-slate-600">Analysér en bolig og tryk &quot;Gem&quot;. Så lander den her, og du kan følge den fra første kig til køb.</p>
        <Link href="/app/analyser" className="mt-5 inline-flex min-h-[48px] items-center gap-1.5 rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white shadow-sm hover:bg-blue-500">
          <Plus size={17} /> Tilføj din første bolig
        </Link>
      </div>
    </div>
  );
}
