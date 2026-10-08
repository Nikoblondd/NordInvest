import { clsx } from "@/lib/clsx";

/*
 * Forsigtig, forventet and optimistisk side by side, the way a bank or a
 * co-investor reads a deal. Each column says what it assumes, and the
 * cautious one uses how far asking prices in the postnummer have actually
 * been cut.
 */

export type Scenario = {
  key: "low" | "base" | "high";
  title: string;
  assumptions: string[];
  arv: number;
  renovation: number;
  months: number;
  profit: number;
  margin: number;
  roi: number;
};

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const pct = (n: number, d = 1) => `${(n * 100).toLocaleString("da-DK", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

export function FlipScenarios({ rows, target }: { rows: Scenario[]; target: number }) {
  const lines: { label: string; get: (s: Scenario) => string; strong?: boolean; tone?: boolean }[] = [
    { label: "Salgspris", get: (s) => kr(s.arv) },
    { label: "Renovering", get: (s) => kr(s.renovation) },
    { label: "Måneder fra køb til salg", get: (s) => `${s.months} mdr.` },
    { label: "Fortjeneste efter skat", get: (s) => kr(s.profit), strong: true, tone: true },
    { label: "Af salgsprisen", get: (s) => pct(s.margin), tone: true },
    { label: "Afkast på egen kapital", get: (s) => pct(s.roi, 0) },
  ];
  const holds = rows.filter((s) => s.profit > 0).length;
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-[15px] font-semibold text-slate-900">Tre scenarier</p>
        <p className="text-[13.5px] text-slate-600">
          {holds === 3 ? "Handlen giver overskud i alle tre." : holds === 0 ? "Handlen giver underskud i alle tre." : `Handlen giver overskud i ${holds} af 3 scenarier.`}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="w-[34%] px-4 py-3 font-medium text-slate-500" />
              {rows.map((s) => (
                <th key={s.key} className={clsx("px-3 py-3 text-right align-bottom", s.key === "base" && "bg-blue-50/50")}>
                  <span className="block text-[14px] font-semibold text-slate-900">{s.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.label} className="border-b border-slate-100">
                <td className={clsx("px-4 py-2.5", l.strong ? "font-semibold text-slate-900" : "text-slate-700")}>{l.label}</td>
                {rows.map((s) => (
                  <td
                    key={s.key}
                    className={clsx(
                      "px-3 py-2.5 text-right tabular-nums",
                      s.key === "base" && "bg-blue-50/50",
                      l.strong && "font-semibold",
                      l.tone ? (l.label === "Af salgsprisen" ? (s.margin >= target / 100 ? "text-emerald-700" : s.profit >= 0 ? "text-amber-700" : "text-rose-600") : s.profit >= 0 ? "text-emerald-700" : "text-rose-600") : "text-slate-900",
                    )}
                  >
                    {l.get(s)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-4 py-3 align-top text-[12.5px] font-medium text-slate-500">Antagelser</td>
              {rows.map((s) => (
                <td key={s.key} className={clsx("px-3 py-3 align-top text-right text-[12.5px] leading-snug text-slate-500", s.key === "base" && "bg-blue-50/50")}>
                  {s.assumptions.map((a) => <span key={a} className="block">{a}</span>)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
