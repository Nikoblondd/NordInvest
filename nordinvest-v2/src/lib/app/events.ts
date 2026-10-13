import type { TaskKind } from "@/lib/mappe/checklist";

/*
 * A calendar entry that is not tied to one property (a bank meeting about the
 * whole loan, a talk with an advisor). Appointments on a property live on the
 * property itself (mappe.tasks); the calendar shows both.
 */
export type CalEvent = {
  id: string;
  kind: TaskKind;
  title: string;
  /** "YYYY-MM-DD" (all day) or "YYYY-MM-DDTHH:mm" (local time). */
  due: string;
  end?: string | null;
  place?: string;
  note?: string;
  done: boolean;
};

const DUE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
const KINDS: TaskKind[] = ["fremvisning", "maegler", "bank", "bud", "raadgiver", "andet"];

export function cleanEvent(raw: unknown, id?: string): CalEvent | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim().slice(0, 140) : "";
  const due = typeof r.due === "string" && DUE.test(r.due) ? r.due : "";
  if (!title || !due) return null;
  return {
    id: id ?? (typeof r.id === "string" && r.id.length <= 64 ? r.id : crypto.randomUUID()),
    kind: KINDS.includes(r.kind as TaskKind) ? (r.kind as TaskKind) : "andet",
    title,
    due,
    end: typeof r.end === "string" && /^\d{2}:\d{2}$/.test(r.end) ? r.end : null,
    place: typeof r.place === "string" ? r.place.trim().slice(0, 140) : "",
    note: typeof r.note === "string" ? r.note.slice(0, 2000) : "",
    done: r.done === true,
  };
}
