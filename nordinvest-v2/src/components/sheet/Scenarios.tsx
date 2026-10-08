import { clsx } from "@/lib/clsx";

/*
 * Forsigtig, forventet and optimistisk side by side, the way a bank or a
 * co-investor reads a deal. Every column states what it assumes.
 */

export type ScenarioColumn = { key: string; title: string; assumptions: string[]; good: boolean };
export type ScenarioLine = { label: string; values: string[]; strong?: boolean; tones?: ("good" | "warn" | "bad" | null)[] };

export function Scenarios({ columns, lines, summary }: { columns: ScenarioColumn[]; lines: ScenarioLine[]; summary: string }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-[15px] font-semibold text-slate-900">Tre scenarier</p>
        <p className="text-[13.5px] text-slate-600">{summary}</p>
      </div>
      <div className="overflow-x-auto">
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
                    <td key={i} className={clsx("px-3 py-2.5 text-right tabular-nums", i === 1 && "bg-blue-50/50", l.strong && "font-semibold", t === "good" ? "text-emerald-700" : t === "warn" ? "text-amber-700" : t === "bad" ? "text-rose-600" : "text-slate-900")}>
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
