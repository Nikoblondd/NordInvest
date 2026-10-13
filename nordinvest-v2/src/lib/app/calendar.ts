import { EMPTY_MAPPE, type LogEntry, type Mappe, type Task, type TaskKind } from "@/lib/mappe/checklist";
import type { CalEvent } from "./events";

/*
 * The calendar's shared model. Appointments live in two places, on a
 * property (mappe.tasks) or on their own (CalEvent); the calendar, the
 * overview and the reminders all see them as one list of CalItems.
 */

export type CalItem = {
  key: string;
  id: string;
  source: "bolig" | "egen";
  rowId: string | null;
  address: string | null;
  kind: TaskKind;
  title: string;
  /** "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" */
  due: string | null;
  end: string | null;
  place: string;
  note: string;
  done: boolean;
};

export const KIND: Record<TaskKind, { label: string; short: string; dot: string; chip: string; block: string }> = {
  fremvisning: { label: "Fremvisning", short: "Fremvisning", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-800 ring-sky-200", block: "border-sky-500 bg-sky-50 text-sky-900" },
  bank: { label: "Bankmøde", short: "Bank", dot: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-800 ring-indigo-200", block: "border-indigo-500 bg-indigo-50 text-indigo-900" },
  maegler: { label: "Mægler", short: "Mægler", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-900 ring-amber-200", block: "border-amber-500 bg-amber-50 text-amber-950" },
  bud: { label: "Bud og frist", short: "Bud", dot: "bg-orange-500", chip: "bg-orange-50 text-orange-800 ring-orange-200", block: "border-orange-500 bg-orange-50 text-orange-900" },
  raadgiver: { label: "Rådgiver", short: "Rådgiver", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-800 ring-violet-200", block: "border-violet-500 bg-violet-50 text-violet-900" },
  andet: { label: "Andet", short: "Andet", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-700 ring-slate-200", block: "border-slate-400 bg-slate-50 text-slate-800" },
};
export const KIND_ORDER: TaskKind[] = ["fremvisning", "bank", "maegler", "bud", "raadgiver", "andet"];

type Row = { id: string; property_url: string | null; property_data: (Record<string, unknown> & { address?: string; mappe?: Mappe }) | null };

export const mappeOf = (r: Row): Mappe => ({ ...EMPTY_MAPPE, ...(r.property_data?.mappe ?? {}) });
export const addressOf = (r: Row) => (r.property_data?.address as string | undefined) || r.property_url || "Bolig";
export const street = (a: string) => a.split(",")[0];

export function itemsFrom(rows: Row[], events: CalEvent[]): CalItem[] {
  const out: CalItem[] = [];
  for (const r of rows) {
    const m = mappeOf(r);
    if (m.stage === "droppet") continue;
    for (const t of m.tasks ?? []) {
      out.push({ key: `${r.id}:${t.id}`, id: t.id, source: "bolig", rowId: r.id, address: addressOf(r), kind: t.kind, title: t.title, due: t.due, end: t.end ?? null, place: t.place ?? "", note: t.note ?? "", done: t.done });
    }
  }
  for (const e of events) out.push({ key: `egen:${e.id}`, id: e.id, source: "egen", rowId: null, address: null, kind: e.kind, title: e.title, due: e.due, end: e.end ?? null, place: e.place ?? "", note: e.note ?? "", done: e.done });
  return out.sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}

export const toTask = (i: Pick<CalItem, "id" | "kind" | "title" | "due" | "end" | "place" | "note" | "done">): Task => ({ id: i.id, kind: i.kind, title: i.title, due: i.due, end: i.end, place: i.place, note: i.note, done: i.done });

/* ---------- Dates (local time, the member's own clock) ---------- */

export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dayOf = (due: string) => due.slice(0, 10);
export const timeOf = (due: string | null) => (due && due.length > 10 ? due.slice(11, 16) : null);
export const parseDay = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Monday of the week containing d. */
export const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
export const clock = (t: string) => t.replace(":", ".");

export function dayLabel(day: string, today = ymd(new Date())): string {
  const diff = Math.round((parseDay(day).getTime() - parseDay(today).getTime()) / 86400000);
  if (diff === 0) return "I dag";
  if (diff === 1) return "I morgen";
  if (diff === -1) return "I går";
  const s = parseDay(day).toLocaleDateString("da-DK", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Adds a line to the case's activity log (newest first, capped). */
export function withLog(m: Mappe, text: string, kind: LogEntry["kind"]): Mappe {
  return { ...m, log: [{ at: new Date().toISOString(), text, kind }, ...(m.log ?? [])].slice(0, 200) };
}

/** An .ics file for one appointment, so it can go into Google, Outlook or Apple Calendar. */
export function icsFor(i: CalItem): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NordInvest//Kalender//DA", "BEGIN:VEVENT", `UID:${i.key}@nordinvest.io`, `DTSTAMP:${stamp}`];
  if (!i.due) return "";
  const day = dayOf(i.due).replace(/-/g, "");
  const t = timeOf(i.due);
  if (t) {
    const start = `${day}T${t.replace(":", "")}00`;
    const endT = i.end ?? `${pad(Math.min(23, Number(t.slice(0, 2)) + 1))}:${t.slice(3)}`;
    lines.push(`DTSTART;TZID=Europe/Copenhagen:${start}`, `DTEND;TZID=Europe/Copenhagen:${day}T${endT.replace(":", "")}00`);
  } else {
    const next = ymd(addDays(parseDay(dayOf(i.due)), 1)).replace(/-/g, "");
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next}`);
  }
  lines.push(`SUMMARY:${esc(i.title)}`);
  const where = [i.place, i.address].filter(Boolean).join(", ");
  if (where) lines.push(`LOCATION:${esc(where)}`);
  if (i.note) lines.push(`DESCRIPTION:${esc(i.note)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(i: CalItem) {
  const blob = new Blob([icsFor(i)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${i.title.replace(/[^\wæøåÆØÅ -]/g, "").slice(0, 40) || "aftale"}.ics`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
