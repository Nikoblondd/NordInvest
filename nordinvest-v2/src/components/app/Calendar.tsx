"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { CalEvent } from "@/lib/app/events";
import { KIND, KIND_ORDER, addDays, clock, dayLabel, dayOf, parseDay, street, timeOf, weekStart, ymd, type CalItem } from "@/lib/app/calendar";
import type { CrmRow } from "@/components/dashboard/Crm";
import { EventDialog, type DialogState } from "./EventDialog";
import { Segmented, Toast, btn } from "./ui";
import { useCalendar } from "./useCalendar";

/*
 * Kalender: every viewing, bank meeting, broker call and deadline in one
 * place, as a month, a week or a list. Click a day or a free slot to add an
 * appointment; drag one to another day on the month view (or open it and
 * change the date); tick it off when it is done.
 */

type View = "maaned" | "uge" | "liste";
const WD = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const HOURS = Array.from({ length: 15 }, (_, i) => 7 + i); // 07-21
const ROW = 52; // px per hour in the week view

export function Calendar({ rows: initialRows, events: initialEvents, initialDay, initialView }: { rows: CrmRow[]; events: CalEvent[]; initialDay?: string; initialView?: string }) {
  const cal = useCalendar(initialRows, initialEvents);
  const today = ymd(new Date());
  const [view, setView] = useState<View>(initialView === "uge" || initialView === "liste" ? initialView : "maaned");
  const [cursor, setCursor] = useState(initialDay && /^\d{4}-\d{2}-\d{2}$/.test(initialDay) ? initialDay : today);
  const [selected, setSelected] = useState<string>(initialDay ?? today);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [kinds, setKinds] = useState<Set<string>>(new Set(KIND_ORDER));

  // Phones open on the list; the choice is remembered on this device.
  useEffect(() => {
    if (initialView) return;
    try {
      const v = localStorage.getItem("ni_cal_view");
      if (v === "maaned" || v === "uge" || v === "liste") setView(v);
      else if (window.innerWidth < 768) setView("liste");
    } catch { /* storage blocked */ }
  }, [initialView]);
  const pickView = (v: View) => { setView(v); try { localStorage.setItem("ni_cal_view", v); } catch { /* ignore */ } };

  const homes = cal.rows.filter((r) => (r.property_data?.mappe?.stage ?? "screening") !== "droppet").map((r) => ({ id: r.id, address: (r.property_data?.address as string | undefined) || r.property_url || "Bolig" }));
  const shown = cal.items.filter((i) => i.due && kinds.has(i.kind));
  const byDay = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const i of shown) { const d = dayOf(i.due!); m.set(d, [...(m.get(d) ?? []), i]); }
    return m;
  }, [shown]);

  const c = parseDay(cursor);
  const step = (n: number) => {
    const d = view === "maaned" ? new Date(c.getFullYear(), c.getMonth() + n, 1) : addDays(c, n * 7);
    setCursor(ymd(d));
  };
  const title = view === "maaned"
    ? c.toLocaleDateString("da-DK", { month: "long", year: "numeric" })
    : view === "uge"
      ? (() => { const s = weekStart(c), e = addDays(s, 6); return `${s.getDate()}. ${s.toLocaleDateString("da-DK", { month: "short" })} – ${e.getDate()}. ${e.toLocaleDateString("da-DK", { month: "short", year: "numeric" })}`; })()
      : "Kommende aftaler";

  const weekCount = shown.filter((i) => { const d = dayOf(i.due!); return d >= ymd(weekStart(new Date())) && d <= ymd(addDays(weekStart(new Date()), 6)) && !i.done; }).length;
  const overdue = cal.items.filter((i) => i.due && !i.done && dayOf(i.due) < today);

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-slate-900 sm:text-[30px]">Kalender</h1>
          <p className="mt-1 text-[15px] text-slate-500">
            {weekCount === 0 ? "Ingen aftaler resten af ugen." : `${weekCount} ${weekCount === 1 ? "aftale" : "aftaler"} denne uge.`}
            {overdue.length > 0 && <span className="font-medium text-rose-600"> {overdue.length} {overdue.length === 1 ? "er overskredet" : "er overskredet"}.</span>}
          </p>
        </div>
        <button type="button" onClick={() => setDialog({ day: selected >= today ? selected : today })} className={btn.primary}><Plus size={16} /> Ny aftale</button>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {view !== "liste" && (
          <>
            <button type="button" onClick={() => { setCursor(today); setSelected(today); }} className={btn.secondary}>I dag</button>
            <div className="flex">
              <button type="button" onClick={() => step(-1)} aria-label={view === "maaned" ? "Forrige måned" : "Forrige uge"} className="flex h-[42px] w-10 items-center justify-center rounded-l-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => step(1)} aria-label={view === "maaned" ? "Næste måned" : "Næste uge"} className="-ml-px flex h-[42px] w-10 items-center justify-center rounded-r-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ChevronRight size={18} /></button>
            </div>
          </>
        )}
        <h2 className="mr-auto min-w-0 px-1 text-[18px] font-semibold text-slate-900 first-letter:uppercase">{title}</h2>
        <Segmented label="Visning" value={view} onChange={pickView} options={[{ id: "maaned", label: "Måned" }, { id: "uge", label: "Uge" }, { id: "liste", label: "Liste" }]} />
      </div>

      {/* Kind filter = legend */}
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Vis typer">
        {KIND_ORDER.map((k) => {
          const on = kinds.has(k);
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => setKinds((s) => { const n = new Set(s); if (on) n.delete(k); else n.add(k); return n.size ? n : new Set(KIND_ORDER); })}
              className={clsx("inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold ring-1 transition-colors", on ? "bg-white text-slate-700 ring-slate-200" : "bg-slate-50 text-slate-400 ring-slate-100 line-through")}>
              <span className={clsx("h-2 w-2 rounded-full", on ? KIND[k].dot : "bg-slate-300")} />{KIND[k].label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {view === "maaned" && <Month cursor={c} today={today} selected={selected} byDay={byDay} onSelect={setSelected} onAdd={(day) => setDialog({ day })} onOpen={(i) => setDialog({ item: i })} onMove={cal.move} />}
          {view === "uge" && <Week cursor={c} today={today} byDay={byDay} onAdd={(day, time) => setDialog({ day, time })} onOpen={(i) => setDialog({ item: i })} />}
          {view === "liste" && <Agenda items={shown} today={today} onOpen={(i) => setDialog({ item: i })} onToggle={cal.toggle} onAdd={() => setDialog({ day: today })} />}
        </div>
        {view !== "liste" && (
          <DayPanel day={selected} today={today} items={byDay.get(selected) ?? []} onAdd={() => setDialog({ day: selected })} onOpen={(i) => setDialog({ item: i })} onToggle={cal.toggle} />
        )}
      </div>

      <EventDialog state={dialog} onClose={() => setDialog(null)} homes={homes} onSave={cal.save} onDelete={cal.remove} />
      {cal.error && <Toast text={cal.error} tone="bad" onClose={cal.clearError} />}
    </div>
  );
}

function Chip({ i, onOpen, draggable }: { i: CalItem; onOpen: () => void; draggable?: boolean }) {
  const t = timeOf(i.due);
  return (
    <button type="button" draggable={draggable} onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", i.key); e.dataTransfer.effectAllowed = "move"; }}
      className={clsx("flex w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-[3px] text-left text-[12px] font-medium ring-1 ring-inset transition-shadow hover:shadow-sm", KIND[i.kind].chip, i.done && "opacity-50 line-through", draggable && "cursor-grab active:cursor-grabbing")}>
      {t && <span className="shrink-0 tabular-nums opacity-70">{clock(t)}</span>}
      <span className="truncate">{i.title}</span>
    </button>
  );
}

function Month({ cursor, today, selected, byDay, onSelect, onAdd, onOpen, onMove }: {
  cursor: Date; today: string; selected: string; byDay: Map<string, CalItem[]>;
  onSelect: (d: string) => void; onAdd: (d: string) => void; onOpen: (i: CalItem) => void; onMove: (i: CalItem, day: string) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = weekStart(first);
  const weeks = Math.ceil(((first.getDay() + 6) % 7 + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const [over, setOver] = useState<string | null>(null);
  const all = useMemo(() => Array.from(byDay.values()).flat(), [byDay]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
        {WD.map((w) => <div key={w} className="px-2 py-2 text-center text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500 sm:text-left">{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = ymd(d);
          const list = byDay.get(key) ?? [];
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = key === today;
          return (
            <div key={key} role="button" tabIndex={0} aria-label={`${dayLabel(key, today)}, ${list.length} aftaler`}
              onClick={() => onSelect(key)} onDoubleClick={() => onAdd(key)}
              onKeyDown={(e) => { if (e.key === "Enter") onSelect(key); }}
              onDragOver={(e) => { e.preventDefault(); setOver(key); }} onDragLeave={() => setOver((o) => (o === key ? null : o))}
              onDrop={(e) => { e.preventDefault(); setOver(null); const k = e.dataTransfer.getData("text/plain"); const it = all.find((x) => x.key === k); if (it && dayOf(it.due!) !== key) onMove(it, key); }}
              className={clsx("group relative min-h-[64px] cursor-pointer border-b border-r border-slate-100 p-1 transition-colors sm:min-h-[112px] sm:p-1.5 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-slate-50/60", selected === key && "bg-blue-50/60", over === key && "bg-blue-100/70 ring-2 ring-inset ring-blue-300")}>
              <div className="flex items-center justify-between">
                <span className={clsx("flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums", isToday ? "bg-blue-600 text-white" : inMonth ? "text-slate-800" : "text-slate-400")}>{d.getDate()}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); onAdd(key); }} aria-label={`Ny aftale ${dayLabel(key, today).toLowerCase()}`} className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-blue-700 group-hover:flex"><Plus size={14} /></button>
              </div>
              {/* Phones: dots. Desktop: chips. */}
              <div className="mt-1 flex flex-wrap gap-0.5 px-1 sm:hidden">
                {list.slice(0, 4).map((i) => <span key={i.key} className={clsx("h-1.5 w-1.5 rounded-full", KIND[i.kind].dot, i.done && "opacity-40")} />)}
              </div>
              <div className="mt-1 hidden space-y-1 sm:block">
                {list.slice(0, 3).map((i) => <Chip key={i.key} i={i} onOpen={() => onOpen(i)} draggable />)}
                {list.length > 3 && <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(key); }} className="px-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-900">+{list.length - 3} mere</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Week({ cursor, today, byDay, onAdd, onOpen }: { cursor: Date; today: string; byDay: Map<string, CalItem[]>; onAdd: (d: string, t: string) => void; onOpen: (i: CalItem) => void }) {
  const start = weekStart(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const scroller = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div ref={scroller} className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50/70">
            <div />
            {days.map((d, i) => {
              const k = ymd(d);
              return (
                <div key={k} className="border-l border-slate-100 px-2 py-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500">{WD[i]}</p>
                  <p className={clsx("mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums", k === today ? "bg-blue-600 text-white" : "text-slate-900")}>{d.getDate()}</p>
                </div>
              );
            })}
          </div>
          {/* All-day row */}
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-slate-200">
            <div className="px-2 py-1.5 text-right text-[11px] font-medium text-slate-400">Hele dagen</div>
            {days.map((d) => {
              const list = (byDay.get(ymd(d)) ?? []).filter((i) => !timeOf(i.due));
              return <div key={ymd(d)} className="min-h-[34px] space-y-1 border-l border-slate-100 p-1">{list.map((i) => <Chip key={i.key} i={i} onOpen={() => onOpen(i)} />)}</div>;
            })}
          </div>
          <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
            <div>
              {HOURS.map((h) => <div key={h} style={{ height: ROW }} className="relative pr-2 text-right text-[11px] tabular-nums text-slate-400"><span className={clsx("relative", h === HOURS[0] ? "top-1" : "-top-2")}>{String(h).padStart(2, "0")}.00</span></div>)}
            </div>
            {days.map((d) => {
              const k = ymd(d);
              const list = (byDay.get(k) ?? []).filter((i) => timeOf(i.due));
              return (
                <div key={k} className={clsx("relative border-l border-slate-100", k === today && "bg-blue-50/30")}>
                  {HOURS.map((h) => (
                    <button key={h} type="button" aria-label={`Ny aftale ${dayLabel(k, today).toLowerCase()} kl. ${h}.00`} onClick={() => onAdd(k, `${String(h).padStart(2, "0")}:00`)}
                      style={{ height: ROW }} className="block w-full border-b border-slate-100 hover:bg-slate-50" />
                  ))}
                  {list.map((i) => {
                    const s = mins(timeOf(i.due)!);
                    const e = i.end ? mins(i.end) : s + 60;
                    const top = ((Math.max(s, 7 * 60) - 7 * 60) / 60) * ROW;
                    const h = Math.max(26, ((Math.min(e, 22 * 60) - Math.max(s, 7 * 60)) / 60) * ROW - 2);
                    return (
                      <button key={i.key} type="button" onClick={() => onOpen(i)} style={{ top, height: h }}
                        className={clsx("absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-[12px] leading-tight shadow-sm transition-shadow hover:shadow-md", KIND[i.kind].block, i.done && "opacity-50")}>
                        <span className="block font-semibold tabular-nums">{clock(timeOf(i.due)!)}{i.end ? `–${clock(i.end)}` : ""}</span>
                        <span className={clsx("block truncate font-medium", i.done && "line-through")}>{i.title}</span>
                        {i.address && h > 50 && <span className="block truncate opacity-75">{street(i.address)}</span>}
                      </button>
                    );
                  })}
                  {now && k === today && now.getHours() >= 7 && now.getHours() < 22 && (
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((now.getHours() * 60 + now.getMinutes() - 7 * 60) / 60) * ROW }}>
                      <span className="-ml-1 h-2 w-2 rounded-full bg-rose-500" /><span className="h-px flex-1 bg-rose-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ItemRow({ i, onOpen, onToggle, showDay }: { i: CalItem; onOpen: () => void; onToggle: () => void; showDay?: boolean }) {
  const t = timeOf(i.due);
  return (
    <li className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3">
      <button type="button" role="checkbox" aria-checked={i.done} aria-label={`Marker ${i.title} som ${i.done ? "ikke klaret" : "klaret"}`} onClick={onToggle} className="group flex h-11 w-11 shrink-0 items-center justify-center">
        <span className={clsx("flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors", i.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 group-hover:border-emerald-500 group-hover:bg-emerald-50")}>
          <Check size={11} strokeWidth={3} className={clsx(i.done ? "opacity-100" : "text-emerald-600 opacity-0 group-hover:opacity-100")} />
        </span>
      </button>
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
        <span className={clsx("h-9 w-1 shrink-0 rounded-full", KIND[i.kind].dot)} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className={clsx("line-clamp-2 block break-words text-[15px] font-medium leading-snug text-slate-900", i.done && "text-slate-400 line-through")}>{i.title}</span>
          <span className="flex min-w-0 items-center gap-1 truncate text-[13px] text-slate-500">
            {i.address ? street(i.address) : KIND[i.kind].label}{i.place && (!i.address || street(i.place) !== street(i.address)) && <><span aria-hidden>·</span><MapPin size={12} className="shrink-0" /><span className="truncate">{i.place}</span></>}
          </span>
        </span>
        <span className="shrink-0 text-right text-[13px] tabular-nums text-slate-600">
          {showDay && i.due && <span className="block font-medium text-slate-800">{dayLabel(dayOf(i.due))}</span>}
          {t ? `${clock(t)}${i.end ? `–${clock(i.end)}` : ""}` : "Hele dagen"}
        </span>
      </button>
    </li>
  );
}

function DayPanel({ day, today, items, onAdd, onOpen, onToggle }: { day: string; today: string; items: CalItem[]; onAdd: () => void; onOpen: (i: CalItem) => void; onToggle: (i: CalItem) => void }) {
  const sorted = [...items].sort((a, b) => (timeOf(a.due) ?? "00:00").localeCompare(timeOf(b.due) ?? "00:00"));
  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white xl:sticky xl:top-20">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3.5">
        <div>
          <p className="text-[15px] font-semibold text-slate-900">{dayLabel(day, today)}</p>
          {/^I (dag|morgen|går)$/.test(dayLabel(day, today)) && <p className="text-[13px] text-slate-500">{parseDay(day).toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" })}</p>}
        </div>
        <button type="button" onClick={onAdd} className={btn.secondary}><Plus size={15} /> Aftale</button>
      </div>
      {sorted.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <CalendarDays className="mx-auto text-slate-300" size={26} />
          <p className="mt-2 text-[14px] text-slate-500">Intet planlagt denne dag.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">{sorted.map((i) => <ItemRow key={i.key} i={i} onOpen={() => onOpen(i)} onToggle={() => onToggle(i)} />)}</ul>
      )}
    </aside>
  );
}

function Agenda({ items, today, onOpen, onToggle, onAdd }: { items: CalItem[]; today: string; onOpen: (i: CalItem) => void; onToggle: (i: CalItem) => void; onAdd: () => void }) {
  const [showDone, setShowDone] = useState(false);
  const overdue = items.filter((i) => !i.done && dayOf(i.due!) < today);
  const coming = items.filter((i) => dayOf(i.due!) >= today && (showDone || !i.done));
  const groups = new Map<string, CalItem[]>();
  for (const i of coming) { const d = dayOf(i.due!); groups.set(d, [...(groups.get(d) ?? []), i]); }
  const done = items.filter((i) => i.done).length;
  if (!overdue.length && !coming.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <CalendarDays className="mx-auto text-slate-300" size={30} />
        <p className="mt-3 text-[16px] font-semibold text-slate-800">Ingen kommende aftaler</p>
        <p className="mx-auto mt-1 max-w-sm text-[14px] text-slate-500">Planlæg en fremvisning, et bankmøde eller en frist for dit bud. Du får en mail dagen før.</p>
        <button type="button" onClick={onAdd} className={clsx(btn.primary, "mt-4")}><Plus size={16} /> Ny aftale</button>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {overdue.length > 0 && (
        <section>
          <h3 className="pb-2 text-[14px] font-semibold text-rose-600">Overskredet <span className="font-medium text-rose-400">{overdue.length}</span></h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-rose-200 bg-white">{overdue.map((i) => <ItemRow key={i.key} i={i} showDay onOpen={() => onOpen(i)} onToggle={() => onToggle(i)} />)}</ul>
        </section>
      )}
      {Array.from(groups.entries()).map(([d, list]) => (
        <section key={d}>
          <h3 className={clsx("pb-2 text-[14px] font-semibold", d === today ? "text-blue-700" : "text-slate-900")}>{dayLabel(d, today)} <span className="font-medium text-slate-400">{parseDay(d).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}</span></h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">{list.map((i) => <ItemRow key={i.key} i={i} onOpen={() => onOpen(i)} onToggle={() => onToggle(i)} />)}</ul>
        </section>
      ))}
      {done > 0 && <button type="button" onClick={() => setShowDone((v) => !v)} className={btn.ghost}>{showDone ? "Skjul klarede" : `Vis klarede (${done})`}</button>}
      <p className="text-[13px] text-slate-500">Se også <Link href="/app/ejendomme" className="font-medium text-blue-700 hover:underline">dine ejendomme</Link> for opgaver uden dato.</p>
    </div>
  );
}
