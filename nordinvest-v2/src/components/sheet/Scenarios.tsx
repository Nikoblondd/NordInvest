"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";

/*
 * Forsigtig, forventet and optimistisk side by side, the way a bank or a
 * co-investor reads a deal. Every column states what it assumes.
 */

export type ScenarioColumn = { key: string; title: string; assumptions: string[]; good: boolean };
export type ScenarioLine = { label: string; values: string[]; strong?: boolean; tones?: ("good" | "warn" | "bad" | null)[] };

const toneClass = (t: "good" | "warn" | "bad" | null | undefined) => (t === "good" ? "text-emerald-700" : t === "warn" ? "text-amber-700" : t === "bad" ? "text-rose-600" : "text-slate-900");

export function Scenarios({ columns, lines, summary }: { columns: ScenarioColumn[]; lines: ScenarioLine[]; summary: string }) {
  const [pick, setPick] = useState(1);
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-[15px] font-semibold text-slate-900">Tre scenarier</p>
        <p className="text-[13.5px] text-slate-600">{summary}</p>
      </div>
      {/* Phones: one scenario at a time, picked with a segmented control. */}
      <div className="sm:hidden">
        <div className="p-3 pb-1" role="tablist" aria-label="Scenarie">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {columns.map((c, i) => (
              <button
                key={c.key} type="button" role="tab" aria-selected={pick === i} onClick={() => setPick(i)}
                className={clsx("flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-1 text-[13.5px] font-semibold transition-colors", pick === i ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-slate-500")}
              >
                <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", c.good ? "bg-emerald-500" : "bg-rose-500")} />
                {c.title}
              </button>
            ))}
          </div>
        </div>
        <dl className="divide-y divide-slate-100 px-4">
          {lines.map((l) => (
            <div key={l.label} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className={clsx("min-w-0 text-[14px]", l.strong ? "font-semibold text-slate-900" : "text-slate-700")}>{l.label}</dt>
              <dd className={clsx("shrink-0 text-right text-[14px] tabular-nums", l.strong && "text-[15px] font-semibold", toneClass(l.tones?.[pick]))}>{l.values[pick]}</dd>
            </div>
          ))}
        </dl>
        <div className="mx-4 mb-4 mt-1 rounded-xl bg-slate-50 px-3.5 py-3">
          <p className="text-[12.5px] font-medium text-slate-500">{columns[pick]?.title} regner med</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {columns[pick]?.assumptions.map((a) => <li key={a} className="rounded-md bg-white px-2 py-1 text-[12.5px] text-slate-700 ring-1 ring-inset ring-slate-200">{a}</li>)}
          </ul>
        </div>
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[560px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="w-[34%] px-4 py-3" />
              {columns.map((c, i) => (
                <th key={c.key} className={clsx("px-3 py-3 text-right text-[14px] font-semibold text-slate-900", i === 1 && "bg-blue-50/50")}>{c.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.label} className="border-b border-slate-100">
                <td className={clsx("px-4 py-2.5", l.strong ? "font-semibold text-slate-900" : "text-slate-700")}>{l.label}</td>
                {l.values.map((v, i) => {
                  const t = l.tones?.[i];
                  return (
                    <td key={i} className={clsx("px-3 py-2.5 text-right tabular-nums", i === 1 && "bg-blue-50/50", l.strong && "font-semibold", toneClass(t))}>
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="px-4 py-3 align-top text-[12.5px] font-medium text-slate-500">Antagelser</td>
              {columns.map((c, i) => (
                <td key={c.key} className={clsx("px-3 py-3 align-top text-right text-[12.5px] leading-snug text-slate-500", i === 1 && "bg-blue-50/50")}>
                  {c.assumptions.map((a) => <span key={a} className="block">{a}</span>)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** "Overskud i 2 af 3 scenarier", from each column's verdict. */
export function scenarioSummary(columns: ScenarioColumn[], what: string, bad: string) {
  const ok = columns.filter((c) => c.good).length;
  return ok === columns.length ? `${what} i alle tre.` : ok === 0 ? `${bad} i alle tre.` : `${what} i ${ok} af ${columns.length} scenarier.`;
}
