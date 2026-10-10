"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { NumberInput } from "@/components/ui/NumberInput";

/*
 * The spreadsheet every analysis leads with: numbered rows, blue cells the
 * user can change, and a formula bar that says in words how the selected row
 * is calculated. Flip, udlejning and forældrekøb all build their rows on it.
 */

export type SheetRow =
  | { kind: "head"; label: string }
  | {
      kind: "row";
      key: string;
      label: string;
      value: number | string;
      formula: string;
      input?: { value: number; set: (n: number) => void; suffix?: string; decimals?: number };
      strong?: boolean;
      tone?: "good" | "bad" | "warn";
      link?: { href: string; text: string };
      total?: boolean; // the bottom line: double underline
    };

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;

export function Sheet({
  title,
  rows,
  initial,
  onExport,
  exporting,
}: {
  title: string;
  rows: SheetRow[];
  initial: string;
  onExport?: () => void;
  exporting?: boolean;
}) {
  const [sel, setSel] = useState(initial);
  const current = rows.find((r) => r.kind === "row" && r.key === sel) as Extract<SheetRow, { kind: "row" }> | undefined;
  let n = 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-[11px] font-bold text-white">X</span>
          <span className="text-[15px] font-semibold text-slate-900">{title}</span>
          <span className="hidden text-[13px] text-slate-500 sm:inline">· blå felter kan rettes</span>
        </div>
        {onExport && (
          <button type="button" onClick={onExport} disabled={exporting} className="no-print inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Hent som Excel
          </button>
        )}
      </div>
      <div className="flex min-h-[44px] items-start gap-3 border-b border-slate-200 px-4 py-2.5 font-mono text-[12.5px] leading-snug">
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-semibold italic text-slate-500">fx</span>
        <span className="min-w-0 text-slate-700">
          <span className="font-semibold text-slate-900">{current?.label}</span> {current?.formula}
        </span>
      </div>

      <table className="w-full table-fixed border-collapse text-[14.5px]">
        <colgroup>
          <col className="w-8 sm:w-9" />
          <col />
          <col className="w-[138px] sm:w-[220px]" />
          <col className="w-0 sm:w-[120px]" />
        </colgroup>
        <tbody>
          {rows.map((r) => {
            if (r.kind === "head") {
              return (
                <tr key={`h-${r.label}`} className="bg-slate-50">
                  <td className="border-y border-slate-200 py-1.5" />
                  <td colSpan={3} className="border-y border-slate-200 py-1.5 pl-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{r.label}</td>
                </tr>
              );
            }
            n += 1;
            const active = sel === r.key;
            const num = typeof r.value === "number" ? kr(r.value) : r.value;
            return (
              <tr
                key={r.key}
                onClick={() => setSel(r.key)}
                className={clsx("cursor-default border-b border-slate-100", active ? "bg-blue-50/60" : "hover:bg-slate-50/70", r.total && "border-t-2 border-t-slate-300")}
              >
                <td className={clsx("py-2 text-center text-[12px] tabular-nums", active ? "font-semibold text-blue-700" : "text-slate-400")}>{n}</td>
                <td className={clsx("py-2 pl-2 pr-2 leading-snug sm:pl-3", r.strong ? "font-semibold text-slate-900" : "text-slate-700")}>{r.label}</td>
                <td className="py-1 pr-2 text-right sm:pr-3">
                  {r.input ? (
                    <label className={clsx("ml-auto flex h-9 max-w-[200px] items-center justify-end gap-1 rounded-md px-2 ring-1 ring-inset", active ? "bg-white ring-blue-400" : "bg-blue-50/70 ring-blue-100")}>
                      <NumberInput
                        value={r.input.value}
                        decimals={r.input.decimals}
                        onFocus={() => setSel(r.key)}
                        onValueChange={(v) => v != null && r.input!.set(v)}
                        aria-label={r.label}
                        className="w-full min-w-0 bg-transparent text-right font-semibold tabular-nums text-blue-700 outline-none"
                      />
                      {r.input.suffix && <span className="shrink-0 text-[12.5px] text-blue-700/70">{r.input.suffix}</span>}
                    </label>
                  ) : (
                    <span
                      className={clsx(
                        "tabular-nums",
                        r.strong && "font-semibold",
                        r.tone === "good" ? "text-emerald-700" : r.tone === "bad" ? "text-rose-600" : r.tone === "warn" ? "text-amber-700" : "text-slate-900",
                        r.total && "text-[17px] underline decoration-double decoration-1 underline-offset-4",
                      )}
                    >
                      {num}
                    </span>
                  )}
                </td>
                <td className="hidden py-2 pr-4 text-right text-[12.5px] sm:table-cell">
                  {r.link && (
                    <a href={r.link.href} onClick={(e) => e.stopPropagation()} className="no-print text-blue-700 hover:underline">
                      {r.link.text}
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
