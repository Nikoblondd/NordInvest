"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarPlus, ChevronDown, Columns3, FileText, Gavel, List, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { EMPTY_MAPPE, OFFER_STATUS, STAGES, STAGE_LABEL, type Mappe, type Offer, type Stage } from "@/lib/mappe/checklist";
import { saveMappe } from "@/lib/mappe/save";
import { KIND, clock, dayLabel, dayOf, parseDay, timeOf, withLog, ymd } from "@/lib/app/calendar";
import { EventDialog, type DialogState } from "@/components/app/EventDialog";
import { OfferDialog, applyOffer, offersOf, OFFER_TONE } from "@/components/app/OfferDialog";
import { Segmented, Toast, btn } from "@/components/app/ui";
import { PropertyImage } from "@/components/app/PropertyImage";
import type { Draft } from "@/components/app/useCalendar";

/*
 * Ejendomme: the pipeline, in the shape people know from HubSpot and Monday.
 * Every saved property is a deal that follows the Danish buying process. The
 * board shows each stage with its count and value; a card shows the next
 * appointment and where the bid stands, and its menu plans a viewing,
 * registers a bid or moves the card (no dragging needed). The list is the
 * same data as a table. Every change is saved on the property's own case.
 */

export type CrmRow = {
  id: string;
  created_at: string;
  investment_score: number | null;
  property_url: string | null;
  property_data: (Record<string, unknown> & { address?: string; price?: number; image?: string; mappe?: Mappe }) | null;
  analysis_result: { cashFlow?: number; capRate?: number; dscr?: number } | null;
};

type Col = Stage | "droppet";
const ALL: Col[] = ["screening", "fremvisning", "dokumenter", "bank", "bud", "koebt", "droppet"];

export const TONE: Record<Col, { pill: string; bar: string; soft: string }> = {
  screening: { pill: "bg-slate-600 text-white", bar: "bg-slate-500", soft: "bg-slate-100 text-slate-500" },
  fremvisning: { pill: "bg-sky-600 text-white", bar: "bg-sky-500", soft: "bg-sky-50 text-sky-600" },
  dokumenter: { pill: "bg-amber-400 text-amber-950", bar: "bg-amber-400", soft: "bg-amber-50 text-amber-600" },
  bank: { pill: "bg-indigo-600 text-white", bar: "bg-indigo-500", soft: "bg-indigo-50 text-indigo-600" },
  bud: { pill: "bg-orange-600 text-white", bar: "bg-orange-500", soft: "bg-orange-50 text-orange-600" },
  koebt: { pill: "bg-emerald-600 text-white", bar: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-600" },
  droppet: { pill: "bg-slate-300 text-slate-700", bar: "bg-slate-300", soft: "bg-slate-100 text-slate-400" },
};

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const mio = (n: number) => (n >= 1e6 ? `${(n / 1e6).toLocaleString("da-DK", { maximumFractionDigits: 1 })} mio.` : `${Math.round(n / 1000).toLocaleString("da-DK")} t.`);
const street = (a: string) => a.split(",")[0];
const city = (a: string) => a.split(",").slice(1).join(",").trim();
const addrOf = (r: CrmRow) => r.property_data?.address || r.property_url || "Bolig";
const priceOf = (r: CrmRow) => Number(r.property_data?.price) || 0;
const mappeOf = (r: CrmRow): Mappe => ({ ...EMPTY_MAPPE, ...(r.property_data?.mappe ?? {}) });
const nextAppt = (m: Mappe) => (m.tasks ?? []).filter((t) => !t.done && t.due && dayOf(t.due) >= ymd(new Date())).sort((a, b) => a.due!.localeCompare(b.due!))[0];
const overdue = (m: Mappe) => (m.tasks ?? []).some((t) => !t.done && t.due && dayOf(t.due) < ymd(new Date()));

export function Crm({ initial }: { initial: CrmRow[]; firstName?: string }) {
  const [rows, setRows] = useState(initial);
  const [view, setView] = useState<"tavle" | "liste">("tavle");
  const [q, setQ] = useState("");
  const [showDropped, setShowDropped] = useState(false);
  const [event, setEvent] = useState<DialogState>(null);
  const [offerFor, setOfferFor] = useState<CrmRow | null>(null);
  const [toast, setToast] = useState<{ text: string; tone?: "bad" } | null>(null);

  useEffect(() => {
    try { const v = localStorage.getItem("ni_crm_view"); if (v === "liste" || v === "tavle") setView(v); } catch { /* storage blocked */ }
  }, []);
  const pickView = (v: "tavle" | "liste") => { setView(v); try { localStorage.setItem("ni_crm_view", v); } catch { /* ignore */ } };

  // Update one property and save it: built from the latest rows and saved
  // outside the state updater, so it runs exactly once.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const update = async (id: string, fn: (m: Mappe) => Mappe) => {
    const r = rowsRef.current.find((x) => x.id === id);
    if (!r) return false;
    const next = fn(mappeOf(r));
    const updated = { ...r, property_data: { ...(r.property_data ?? {}), mappe: next } };
    rowsRef.current = rowsRef.current.map((x) => (x.id === id ? updated : x));
    setRows(rowsRef.current);
    const ok = await saveMappe(r.id, r.property_data ?? {}, next);
    if (!ok) setToast({ text: "Ændringen kunne ikke gemmes. Prøv igen.", tone: "bad" });
    return ok;
  };
  const move = (id: string, stage: Col) => {
    const r = rowsRef.current.find((x) => x.id === id);
    if (!r || mappeOf(r).stage === stage) return;
    void update(id, (m) => withLog({ ...m, stage }, `Flyttet til ${STAGE_LABEL[stage]}`, "fase"));
    setToast({ text: `${street(addrOf(r))} flyttet til ${STAGE_LABEL[stage]}.` });
  };
  const saveEvent = async (d: Draft) => {
    if (!d.rowId) return false;
    const id = `t${Date.now()}`;
    return update(d.rowId, (m) => withLog({ ...m, tasks: [...(m.tasks ?? []), { id, kind: d.kind, title: d.title, due: d.due, end: d.end, place: d.place, note: d.note, done: false }] }, d.title, "aftale"));
  };

  const needle = q.trim().toLowerCase();
  const visible = rows.filter((r) => !needle || addrOf(r).toLowerCase().includes(needle));
  const byStage = useMemo(() => {
    const out = Object.fromEntries(ALL.map((c) => [c, [] as CrmRow[]])) as Record<Col, CrmRow[]>;
    for (const r of visible) out[mappeOf(r).stage]?.push(r);
    return out;
  }, [visible]);

  const live = rows.filter((r) => mappeOf(r).stage !== "droppet");
  const active = live.filter((r) => mappeOf(r).stage !== "koebt");
  const value = active.reduce((s, r) => s + priceOf(r), 0);
  const offers = live.filter((r) => { const o = mappeOf(r).offer; return o && (o.status === "afgivet" || o.status === "modbud"); }).length;
  const week = live.filter((r) => { const t = nextAppt(mappeOf(r)); return t && dayOf(t.due!) <= ymd(new Date(Date.now() + 7 * 86400000)); }).length;
  const cols: Col[] = [...STAGES.map((s) => s.id), ...(showDropped ? (["droppet"] as Col[]) : [])];
  const homes = live.map((r) => ({ id: r.id, address: addrOf(r) }));
  const actions = { onMove: move, onPlan: (r: CrmRow) => setEvent({ rowId: r.id, kind: "fremvisning" }), onOffer: (r: CrmRow) => setOfferFor(r) };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[30px]">Ejendomme</h1>
          <p className="mt-1 text-[15px] text-slate-500">
            {rows.length === 0 ? "Her samler du de boliger, du overvejer at købe." : `${active.length} i gang${value ? ` for ${mio(value)} kr.` : ""} · ${offers} ${offers === 1 ? "bud" : "bud"} ude · ${week} med aftale de næste 7 dage`}
          </p>
        </div>
        <Link href="/app/analyser" className={btn.primary}><Plus size={16} /> Tilføj bolig</Link>
      </div>

      {rows.length === 0 ? <EmptyBoard /> : (
        <>
          {/* Stage summary: count and value per stage, the way a sales pipeline reads */}
          <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STAGES.map((s) => {
              const list = live.filter((r) => mappeOf(r).stage === s.id);
              return (
                <div key={s.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className={clsx("h-1", TONE[s.id].bar)} />
                  <div className="px-3 py-2.5">
                    <p className="truncate text-[12px] font-semibold text-slate-500">{s.label}</p>
                    <p className="mt-0.5 text-[20px] font-semibold leading-none tabular-nums text-slate-900">{list.length}</p>
                    <p className="mt-1 truncate text-[12px] tabular-nums text-slate-500">{list.length ? `${mio(list.reduce((n, r) => n + priceOf(r), 0))} kr.` : "–"}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 basis-[220px] sm:max-w-[340px]">
              <span className="sr-only">Søg i dine ejendomme</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg på adresse" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-[14px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
              {q && <button type="button" onClick={() => setQ("")} aria-label="Ryd søgning" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-700"><X size={15} /></button>}
            </label>
            <div className="ml-auto flex items-center gap-2">
              {byStage.droppet.length > 0 && (
                <button type="button" onClick={() => setShowDropped((v) => !v)} className={btn.ghost}>{showDropped ? "Skjul droppede" : `Droppede (${byStage.droppet.length})`}</button>
              )}
              <div className="hidden lg:block">
                <Segmented label="Visning" value={view} onChange={pickView} size="sm" options={[{ id: "tavle", label: <><Columns3 size={15} /> Tavle</> }, { id: "liste", label: <><List size={15} /> Liste</> }]} />
              </div>
            </div>
          </div>

          {view === "tavle" && <Board cols={cols} byStage={byStage} {...actions} />}
          <div className={clsx("mt-4", view === "tavle" && "lg:hidden")}>
            <ListView cols={cols} byStage={byStage} {...actions} />
          </div>
          {visible.length === 0 && <p className="mt-6 text-center text-[15px] text-slate-500">Ingen adresser matcher &quot;{q}&quot;.</p>}
        </>
      )}

      <EventDialog state={event} onClose={() => setEvent(null)} homes={homes} onSave={saveEvent} />
      <OfferDialog open={!!offerFor} onClose={() => setOfferFor(null)} offer={null} price={offerFor ? priceOf(offerFor) : 0} maxBid={offerFor ? mappeOf(offerFor).maxBid : null}
        onSave={(o, existed) => (offerFor ? update(offerFor.id, (m) => applyOffer(m, o, existed)) : false)} />
      {toast && <Toast text={toast.text} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}

type Actions = { onMove: (id: string, s: Col) => void; onPlan: (r: CrmRow) => void; onOffer: (r: CrmRow) => void };
type ViewProps = Actions & { cols: Col[]; byStage: Record<Col, CrmRow[]> };

/** The card's menu: everything you can drag, plus the two most common next steps. */
function CardMenu({ r, stage, onMove, onPlan, onOffer }: Actions & { r: CrmRow; stage: Col }) {
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;
  // The board scrolls sideways, which clips anything inside it. The menu is
  // therefore drawn on top of the page, below the button or above it when
  // there is not room, and always inside the window.
  const place = () => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    const W = 224, H = menuRef.current?.offsetHeight ?? 420, gap = 6, pad = 8;
    const below = window.innerHeight - b.bottom - gap - pad;
    const above = b.top - gap - pad;
    const up = below < H && above > below;
    const maxH = Math.max(160, up ? above : below);
    const top = up ? Math.max(pad, b.top - gap - Math.min(H, maxH)) : b.bottom + gap;
    const left = Math.min(Math.max(pad, b.right - W), window.innerWidth - W - pad);
    setPos({ top, left, maxH });
  };
  useEffect(() => {
    if (!open) return;
    place();
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setPos(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setPos(null); };
    const shut = () => setPos(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", shut);
    window.addEventListener("scroll", shut, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", shut);
      window.removeEventListener("scroll", shut, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const close = () => setPos(null);
  const item = "flex min-h-[40px] w-full items-center gap-2.5 px-3 text-left text-[14px] text-slate-700 hover:bg-slate-50";
  return (
    <>
      <button ref={btnRef} type="button" aria-label={`Handlinger for ${street(addrOf(r))}`} aria-haspopup="menu" aria-expanded={open}
        onClick={() => (open ? close() : setPos({ top: -9999, left: -9999, maxH: 600 }))}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><MoreHorizontal size={17} /></button>
      {open && createPortal(
        <div ref={menuRef} role="menu" style={{ top: pos.top, left: pos.left, maxHeight: pos.maxH }}
          className="fixed z-[80] w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10">
          <button type="button" role="menuitem" className={item} onClick={() => { close(); onPlan(r); }}><CalendarPlus size={15} className="text-slate-400" /> Planlæg aftale</button>
          <button type="button" role="menuitem" className={item} onClick={() => { close(); onOffer(r); }}><Gavel size={15} className="text-slate-400" /> Registrér bud</button>
          <p className="border-t border-slate-100 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Flyt til</p>
          {STAGES.filter((s) => s.id !== stage).map((s) => (
            <button key={s.id} type="button" role="menuitem" className={item} onClick={() => { close(); onMove(r.id, s.id); }}><span className={clsx("h-2 w-2 rounded-full", TONE[s.id].bar)} />{s.label}</button>
          ))}
          {stage !== "droppet" && <button type="button" role="menuitem" className={clsx(item, "border-t border-slate-100 text-rose-600 hover:bg-rose-50")} onClick={() => { close(); onMove(r.id, "droppet"); }}><Trash2 size={15} /> Drop boligen</button>}
        </div>,
        document.body,
      )}
    </>
  );
}

function Thumb({ r, stage, size = 44 }: { r: CrmRow; stage: Col; size?: number }) {
  const img = typeof r.property_data?.image === "string" ? r.property_data.image : null;
  return (
    <span className={clsx("flex shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-slate-200/70", TONE[stage].soft)} style={{ width: size, height: size }}>
      <PropertyImage src={img} />
    </span>
  );
}

function CashFlow({ v }: { v: number | undefined }) {
  if (v == null || !Number.isFinite(v)) return null;
  return <span className={clsx("whitespace-nowrap rounded px-1.5 py-0.5 text-[12px] font-semibold tabular-nums", v >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{v >= 0 ? "+" : "-"}{Math.round(Math.abs(v)).toLocaleString("da-DK")} kr./md.</span>;
}

/** "I dag", "I morgen" or "fre. 17. okt." */
function shortDay(day: string) {
  const l = dayLabel(day);
  if (/^I (dag|morgen|går)$/.test(l)) return l;
  return parseDay(day).toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" });
}

function ApptChip({ m }: { m: Mappe }) {
  const t = nextAppt(m);
  if (!t) return overdue(m) ? <span className="text-[12px] font-semibold text-rose-600">Overskredet opgave</span> : null;
  const time = timeOf(t.due);
  return (
    <span className="flex w-full min-w-0 items-center gap-1.5 text-[12px] font-medium text-slate-700">
      <span className={clsx("h-2 w-2 shrink-0 rounded-full", KIND[t.kind].dot)} />
      <span className="min-w-0 truncate"><b className="font-semibold">{shortDay(dayOf(t.due!))}{time ? ` ${clock(time)}` : ""}</b> · {t.title}</span>
    </span>
  );
}

function OfferChip({ o }: { o: Offer | null | undefined }) {
  if (!o) return null;
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-semibold ring-1", OFFER_TONE[o.status])}>
      <Gavel size={11} /> {mio(o.amount)} · {OFFER_STATUS[o.status]}
    </span>
  );
}

function Board({ cols, byStage, ...a }: ViewProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Col | null>(null);
  return (
    <div className="mt-4 hidden snap-x gap-3 overflow-x-auto pb-3 [scrollbar-width:thin] lg:grid" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(236px, 1fr))` }}>
      {cols.map((c) => {
        const total = byStage[c].reduce((n, r) => n + priceOf(r), 0);
        return (
          <div key={c}
            onDragOver={(e) => { e.preventDefault(); setOver(c); }}
            onDragLeave={() => setOver((o) => (o === c ? null : o))}
            onDrop={(e) => { e.preventDefault(); if (dragId) a.onMove(dragId, c); setDragId(null); setOver(null); }}
            className={clsx("flex min-h-[340px] min-w-0 flex-col rounded-xl transition-colors", over === c && dragId ? "bg-blue-50 ring-2 ring-blue-300" : "bg-slate-100/80")}>
            <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
              <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-800"><span className={clsx("h-2.5 w-2.5 rounded-full", TONE[c].bar)} />{STAGE_LABEL[c]} <span className="font-medium tabular-nums text-slate-400">{byStage[c].length}</span></span>
              {total > 0 && <span className="whitespace-nowrap text-[12px] font-medium tabular-nums text-slate-500">{mio(total)}</span>}
            </div>
            <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
              {byStage[c].map((r) => {
                const m = mappeOf(r);
                const addr = addrOf(r);
                const price = priceOf(r);
                const o = offersOf(m)[0];
                return (
                  <div key={r.id} draggable onDragStart={() => setDragId(r.id)} onDragEnd={() => { setDragId(null); setOver(null); }}
                    className={clsx("relative cursor-grab rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-shadow hover:border-slate-300 hover:shadow-md active:cursor-grabbing", dragId === r.id && "opacity-40")}>
                  <Link href={`/app/ejendomme/${r.id}`} draggable={false} className="block rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <div className="flex items-start gap-2.5 pr-7">
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
                    {(nextAppt(m) || overdue(m) || o || m.docs.length > 0) && (
                      <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2">
                        <ApptChip m={m} />
                        {(o || m.docs.length > 0) && (
                          <div className="flex items-center justify-between gap-2">
                            {o ? <OfferChip o={o} /> : <span />}
                            {m.docs.length > 0 && <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-slate-500"><FileText size={13} /> {m.docs.length}</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                  <div className="absolute right-1.5 top-1.5"><CardMenu r={r} stage={c} {...a} /></div>
                  </div>
                );
              })}
              {byStage[c].length === 0 && <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 px-2 py-8 text-center text-[13px] text-slate-400">Træk en bolig hertil</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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

function ListView({ cols, byStage, ...a }: ViewProps) {
  const grid = "lg:grid lg:grid-cols-[minmax(0,2fr)_140px_120px_minmax(0,1.1fr)_minmax(0,1.6fr)_44px] lg:gap-4";
  return (
    <div className="space-y-6">
      {cols.filter((c) => byStage[c].length > 0).map((c) => (
        <section key={c}>
          <h2 className="flex items-center gap-2 pb-2 text-[15px] font-semibold text-slate-900">
            <span className={clsx("h-4 w-1 rounded-full", TONE[c].bar)} aria-hidden /> {STAGE_LABEL[c]}
            <span className="text-[14px] font-medium tabular-nums text-slate-400">{byStage[c].length}</span>
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className={clsx("hidden border-b border-slate-100 bg-slate-50 px-4 py-2 text-[12px] font-semibold text-slate-500", grid)}>
              <span>Bolig</span><span>Fase</span><span>Pris</span><span>Bud</span><span>Næste aftale</span><span />
            </div>
            <ul className="divide-y divide-slate-100">
              {byStage[c].map((r) => {
                const m = mappeOf(r);
                const addr = addrOf(r);
                const price = priceOf(r);
                return (
                  <li key={r.id} className={clsx("flex flex-wrap items-center gap-3 px-3 py-3 lg:px-4", grid)}>
                    <Link href={`/app/ejendomme/${r.id}`} className="order-1 flex min-w-0 flex-1 items-center gap-3 lg:order-none">
                      <Thumb r={r} stage={c} />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-slate-900 hover:text-blue-700">{street(addr)}</span>
                        <span className="block truncate text-[13px] text-slate-500">{city(addr)}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5 lg:hidden">{price > 0 && <span className="text-[13px] font-semibold tabular-nums text-slate-700">{kr(price)}</span>}<OfferChip o={offersOf(m)[0]} /></span>
                      </span>
                    </Link>
                    <span className="order-3 w-full pl-[56px] lg:order-none lg:w-auto lg:pl-0"><StagePill stage={c} onChange={(s) => a.onMove(r.id, s)} label={street(addr)} /></span>
                    <span className="hidden text-[14px] tabular-nums text-slate-800 lg:block">{price > 0 ? kr(price) : "–"}</span>
                    <span className="hidden min-w-0 lg:block">{offersOf(m)[0] ? <OfferChip o={offersOf(m)[0]} /> : <span className="text-[13px] text-slate-400">Intet bud</span>}</span>
                    <span className="hidden min-w-0 lg:block">{nextAppt(m) || overdue(m) ? <ApptChip m={m} /> : <button type="button" onClick={() => a.onPlan(r)} className="text-[13px] font-medium text-blue-700 hover:underline">Planlæg</button>}</span>
                    <span className="order-2 flex justify-end lg:order-none"><CardMenu r={r} stage={c} {...a} /></span>
                    <span className="order-4 w-full pl-[56px] empty:hidden lg:hidden"><ApptChip m={m} /></span>
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

function EmptyBoard() {
  return (
    <div className="relative mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/app/il-pipe.jpg" alt="" className="mx-auto mt-6 w-full max-w-[340px]" />
      <div className="px-5 pb-10 pt-2 text-center">
        <h2 className="text-[20px] font-semibold text-slate-900">Ingen boliger endnu</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[15px] text-slate-600">Gem en bolig fra Find boliger, fra en søgeagent eller fra en analyse. Så lander den her, og du kan følge den fra første kig til køb.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/app/find" className={btn.primary}><Search size={16} /> Find boliger</Link>
          <Link href="/app/analyser" className={btn.secondary}><Plus size={16} /> Analysér et link</Link>
        </div>
      </div>
    </div>
  );
}
