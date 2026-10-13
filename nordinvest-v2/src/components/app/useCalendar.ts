"use client";

import { useMemo, useRef, useState } from "react";
import { saveMappe } from "@/lib/mappe/save";
import { fmtDue, type Mappe } from "@/lib/mappe/checklist";
import type { CalEvent } from "@/lib/app/events";
import { itemsFrom, mappeOf, toTask, withLog, type CalItem } from "@/lib/app/calendar";
import type { CrmRow } from "@/components/dashboard/Crm";

/*
 * The calendar's state and every change to it, for any page that shows
 * appointments (Kalender, Overblik). Appointments on a property are saved on
 * the property; the rest go to the member's own list. Moving an appointment
 * from one to the other is a delete there and a create here.
 */

export type Draft = Omit<CalItem, "key" | "source" | "address"> & { key?: string };

export function useCalendar(initialRows: CrmRow[], initialEvents: CalEvent[]) {
  const [rows, setRows] = useState(initialRows);
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const items = useMemo(() => itemsFrom(rows, events), [rows, events]);

  const updateRow = async (rowId: string, fn: (m: Mappe) => Mappe) => {
    const r = rowsRef.current.find((x) => x.id === rowId);
    if (!r) return false;
    const next = fn(mappeOf(r));
    const updated = { ...r, property_data: { ...(r.property_data ?? {}), mappe: next } };
    rowsRef.current = rowsRef.current.map((x) => (x.id === rowId ? updated : x));
    setRows(rowsRef.current);
    const ok = await saveMappe(r.id, r.property_data ?? {}, next);
    if (!ok) setError("Aftalen kunne ikke gemmes. Prøv igen.");
    return ok;
  };

  const api = async (method: "POST" | "PATCH" | "DELETE", body?: unknown, id?: string) => {
    const r = await fetch(`/api/app/events${id ? `?id=${encodeURIComponent(id)}` : ""}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    const d = r ? await r.json().catch(() => null) : null;
    if (!d?.ok) setError("Aftalen kunne ikke gemmes. Prøv igen.");
    return d as { ok: boolean; event?: CalEvent } | null;
  };

  const remove = async (item: CalItem) => {
    if (item.source === "bolig" && item.rowId) {
      return updateRow(item.rowId, (m) => ({ ...m, tasks: (m.tasks ?? []).filter((t) => t.id !== item.id) }));
    }
    setEvents((all) => all.filter((e) => e.id !== item.id));
    return !!(await api("DELETE", undefined, item.id))?.ok;
  };

  const save = async (d: Draft): Promise<boolean> => {
    setError(null);
    const old = d.key ? items.find((i) => i.key === d.key) : undefined;
    const sameHome = old && ((old.source === "bolig" && old.rowId === d.rowId) || (old.source === "egen" && !d.rowId));
    if (old && !sameHome) await remove(old);
    const keepOld = old && sameHome;

    if (d.rowId) {
      const id = keepOld ? old!.id : `t${Date.now()}`;
      const task = toTask({ ...d, id });
      return updateRow(d.rowId, (m) => {
        const tasks = keepOld ? (m.tasks ?? []).map((t) => (t.id === id ? task : t)) : [...(m.tasks ?? []), task];
        const next = { ...m, tasks };
        return keepOld ? next : withLog(next, `${task.title}${task.due ? `, ${fmtDue(task.due)}` : ""}`, "aftale");
      });
    }
    const body = { event: { ...(keepOld ? { id: old!.id } : {}), kind: d.kind, title: d.title, due: d.due, end: d.end, place: d.place, note: d.note, done: d.done } };
    const res = await api(keepOld ? "PATCH" : "POST", body);
    if (res?.ok && res.event) setEvents((all) => (keepOld ? all.map((e) => (e.id === res.event!.id ? res.event! : e)) : [...all, res.event!]));
    return !!res?.ok;
  };

  const toggle = (item: CalItem) => save({ ...item, done: !item.done });
  const move = (item: CalItem, day: string) => save({ ...item, due: item.due && item.due.length > 10 ? `${day}${item.due.slice(10)}` : day });

  return { rows, setRows, events, items, save, remove, toggle, move, error, clearError: () => setError(null) };
}
