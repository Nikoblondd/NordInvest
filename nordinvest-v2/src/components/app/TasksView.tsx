"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "@/lib/clsx";
import { Tasks, type CrmRow } from "@/components/dashboard/Crm";
import { EMPTY_MAPPE, daysUntil, type Mappe, type Task } from "@/lib/mappe/checklist";
import { saveMappe } from "@/lib/mappe/save";

/*
 * Opgaver: every to-do across the member's properties. The week strip shows
 * the next seven days at a glance; the list below adds, groups and ticks off.
 */

const TONE: Record<string, string> = {
  fremvisning: "border-sky-500 bg-sky-50 text-sky-900",
  bank: "border-indigo-500 bg-indigo-50 text-indigo-900",
  bud: "border-orange-500 bg-orange-50 text-orange-900",
  maegler: "border-slate-400 bg-slate-50 text-slate-800",
  raadgiver: "border-emerald-500 bg-emerald-50 text-emerald-900",
  andet: "border-slate-300 bg-white text-slate-800",
};

export function TasksView({ initial }: { initial: CrmRow[] }) {
  const [rows, setRows] = useState(initial);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const mappeOf = (r: CrmRow): Mappe => ({ ...EMPTY_MAPPE, ...(r.property_data?.mappe ?? {}) });
  const update = (id: string, fn: (m: Mappe) => Mappe) => {
    const r = rowsRef.current.find((x) => x.id === id);
    if (!r) return;
    const next = fn(mappeOf(r));
    const updated = { ...r, property_data: { ...(r.property_data ?? {}), mappe: next } };
    rowsRef.current = rowsRef.current.map((x) => (x.id === id ? updated : x));
    setRows(rowsRef.current);
    void saveMappe(r.id, r.property_data ?? {}, next);
  };

  const live = rows.filter((r) => mappeOf(r).stage !== "droppet");
  const tasks = useMemo(() => live.flatMap((r) => (mappeOf(r).tasks ?? []).filter((t) => !t.done).map((t) => ({ t, r })))
    .sort((a, b) => (a.t.due ?? "9999").localeCompare(b.t.due ?? "9999")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]);

  const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() + k); return d; });
  const onDay = (k: number) => tasks.filter(({ t }) => t.due && daysUntil(t.due) === k);

  if (live.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-[17px] font-semibold">Ingen boliger endnu</p>
        <p className="mx-auto mt-1 max-w-md text-[15px] text-slate-500">Opgaver hører til en bolig. Gem din første bolig, så kan du planlægge fremvisninger og bankmøder her.</p>
        <Link href="/app/analyser" className="mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-blue-600 px-4 text-[15px] font-semibold text-white hover:bg-blue-500">Tilføj bolig</Link>
      </div>
    );
  }

  return (
    <>
      <section aria-label="De næste 7 dage" className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white [scrollbar-width:none]">
        <div className="grid min-w-[760px] grid-cols-7 divide-x divide-slate-100">
          {days.map((d, k) => {
            const items = onDay(k);
            return (
              <div key={k} className="min-h-[150px] p-2.5">
                <p className={clsx("flex items-center gap-1.5 text-[13px] font-semibold", k === 0 ? "text-blue-700" : "text-slate-600")}>
                  {d.toLocaleDateString("da-DK", { weekday: "short" }).replace(".", "")}
                  <span className={clsx("flex h-6 min-w-[24px] items-center justify-center rounded-full px-1 tabular-nums", k === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700")}>{d.getDate()}</span>
                </p>
                <div className="mt-2 space-y-1.5">
                  {items.map(({ t, r }) => <DayItem key={`${r.id}-${t.id}`} t={t} r={r} />)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <Tasks rows={live} tasks={tasks} update={update} />
    </>
  );
}

function DayItem({ t, r }: { t: Task; r: CrmRow }) {
  const addr = (r.property_data?.address || r.property_url || "Bolig").split(",")[0];
  return (
    <Link href={`/app/ejendomme/${r.id}?fane=opgaver`} className={clsx("block rounded-md border-l-[3px] px-2 py-1.5 transition-opacity hover:opacity-80", TONE[t.kind] ?? TONE.andet)}>
      {t.due && t.due.length > 10 && <span className="block text-[12px] tabular-nums opacity-70">{t.due.slice(11, 16).replace(":", ".")}</span>}
      <span className="block truncate text-[13px] font-semibold">{t.title}</span>
      <span className="block truncate text-[12px] opacity-70">{addr}</span>
    </Link>
  );
}
