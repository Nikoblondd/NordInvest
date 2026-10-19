import { clsx } from "@/lib/clsx";
import { STAGE_LABEL, type Stage } from "@/lib/mappe/checklist";
import type { Access, MemberSummary } from "@/lib/admin/members";

/* Small pieces shared by the member board and the member profile. */

export const STAGE_ORDER: (Stage | "droppet")[] = ["screening", "fremvisning", "dokumenter", "bank", "bud", "koebt", "droppet"];
export const STAGE_BAR: Record<Stage | "droppet", string> = {
  screening: "bg-slate-500", fremvisning: "bg-sky-500", dokumenter: "bg-amber-400", bank: "bg-indigo-500", bud: "bg-orange-500", koebt: "bg-emerald-500", droppet: "bg-slate-300",
};

const ACCESS: Record<Access, [string, string]> = {
  admin: ["Administrator", "bg-violet-50 text-violet-800 ring-violet-200"],
  member: ["Medlem", "bg-emerald-50 text-emerald-800 ring-emerald-200"],
  broker: ["Mægler", "bg-amber-50 text-amber-800 ring-amber-200"],
  revoked: ["Adgang fjernet", "bg-rose-50 text-rose-700 ring-rose-200"],
  none: ["Ingen adgang", "bg-slate-100 text-slate-600 ring-slate-200"],
};

export function AccessBadge({ access, alsoBroker }: { access: Access; alsoBroker?: boolean }) {
  const [base, tone] = ACCESS[access];
  const label = alsoBroker && access === "member" ? "Medlem + mægler" : base;
  return <span className={clsx("inline-flex items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-semibold ring-1", tone)}>{label}</span>;
}

export function Avatar({ m, size = 40 }: { m: Pick<MemberSummary, "name" | "email" | "access">; size?: number }) {
  const text = (m.name.trim() ? m.name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("") : m.email.slice(0, 2)).toUpperCase();
  return (
    <span style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className={clsx("flex shrink-0 items-center justify-center rounded-full font-semibold", m.access === "admin" ? "bg-violet-600 text-white" : m.access === "member" || m.access === "broker" ? "bg-[#17213a] text-white" : "bg-slate-200 text-slate-500")}>
      {text}
    </span>
  );
}

/** Analyses per week as small bars; the last bar is this week. */
export function Spark({ data, height = 24, className }: { data: number[]; height?: number; className?: string }) {
  const max = Math.max(1, ...data);
  return (
    <span className={clsx("flex items-end gap-[2px]", className)} style={{ height }} aria-hidden>
      {data.map((v, i) => (
        <span key={i} className={clsx("w-[5px] rounded-sm", v ? (i === data.length - 1 ? "bg-blue-600" : "bg-blue-400") : "bg-slate-200")} style={{ height: v ? Math.max(4, (v / max) * height) : 3 }} />
      ))}
    </span>
  );
}

/** Saved properties per stage as one stacked bar. */
export function PipelineBar({ pipeline, className }: { pipeline: MemberSummary["pipeline"]; className?: string }) {
  const total = STAGE_ORDER.reduce((n, s) => n + (pipeline[s] ?? 0), 0);
  if (!total) return <span className="text-[13px] text-slate-400">Ingen</span>;
  return (
    <span className={clsx("flex h-2 w-full min-w-[80px] overflow-hidden rounded-full bg-slate-100", className)} title={STAGE_ORDER.filter((s) => pipeline[s]).map((s) => `${STAGE_LABEL[s]}: ${pipeline[s]}`).join(" · ")}>
      {STAGE_ORDER.filter((s) => pipeline[s]).map((s) => <span key={s} className={STAGE_BAR[s]} style={{ width: `${((pipeline[s] ?? 0) / total) * 100}%` }} />)}
    </span>
  );
}

export function ago(iso: string | null): string {
  if (!iso) return "Aldrig";
  const d = Date.now() - Date.parse(iso);
  const min = Math.round(d / 60000);
  if (min < 2) return "Lige nu";
  if (min < 60) return `${min} min. siden`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} t. siden`;
  const days = Math.round(h / 24);
  if (days === 1) return "I går";
  if (days < 30) return `${days} dage siden`;
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
}

export const dateDk = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Copenhagen" }) : "Ikke endnu");

export const tourLabel = (t: string | null) => (t === "done" ? "Gennemført" : t === "skipped" ? "Sprunget over" : "Ikke startet");
