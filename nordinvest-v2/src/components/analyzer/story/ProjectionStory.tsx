"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { clsx } from "@/lib/clsx";

const dk = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("da-DK") : "–");
const kShort = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toLocaleString("da-DK", { maximumFractionDigits: 1 })} mio`;
  return `${Math.round(v / 1000).toLocaleString("da-DK")}k`;
};

/**
 * The long game: what the deal becomes over the hold period. Three outcome
 * numbers up top (the answer), the equity + cumulative cash-flow curves under
 * them (the proof).
 */
export function ProjectionStory({
  data,
  holdYears,
  totalProfit,
  netSaleProceeds,
  irr,
  appreciationLabel,
  rentGrowthLabel,
}: {
  data: { year: number; equity: number; cumulativeCashFlow: number }[];
  holdYears: number;
  totalProfit: number;
  netSaleProceeds: number;
  irr: number;
  appreciationLabel: string;
  rentGrowthLabel: string;
}) {
  const stats = [
    {
      label: `Samlet gevinst efter ${holdYears} år`,
      value: `${totalProfit >= 0 ? "+" : "−"}${dk(Math.abs(totalProfit))}`,
      unit: "kr",
      tone: totalProfit >= 0 ? "text-emerald-600" : "text-rose-600",
    },
    { label: "Nettoprovenu ved salg", value: dk(netSaleProceeds), unit: "kr", tone: "text-slate-900" },
    {
      label: "Årligt afkast (IRR)",
      value: Number.isFinite(irr) ? irr.toLocaleString("da-DK", { maximumFractionDigits: 1 }) : "–",
      unit: "%",
      tone: Number.isFinite(irr) && irr >= 8 ? "text-emerald-600" : "text-slate-900",
    },
  ];

  return (
    <div>
      <dl className="grid gap-y-5 sm:grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.label} className={clsx("min-w-0", i > 0 && "sm:border-l sm:border-slate-200 sm:pl-6")}>
            <dt className="truncate text-[15px] font-medium text-slate-500">{s.label}</dt>
            <dd className={clsx("mt-1 whitespace-nowrap text-[32px] font-semibold leading-tight tabular-nums tracking-[-0.03em] sm:text-[38px]", s.tone)}>
              {s.value}
              <span className="ml-1 text-lg font-medium tracking-normal text-slate-400">{s.unit}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-200 pt-5 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 rounded-full bg-blue-600" /> Friværdi
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-4 rounded-full bg-emerald-500" /> Samlet cash flow
        </span>
        <span className="sm:ml-auto">
          Antager {appreciationLabel} værdistigning og {rentGrowthLabel} lejevækst om året
        </span>
      </div>

      <div className="mt-4 h-64 sm:h-72" role="img" aria-label={`Friværdi og samlet cash flow over ${holdYears} år`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="gEq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="year" tickFormatter={(y) => `År ${y}`} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={kShort} stroke="#94a3b8" fontSize={11} width={52} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v, name) => [`${dk(Number(v))} kr`, name === "equity" ? "Friværdi" : "Samlet cash flow"]}
              labelFormatter={(y) => `År ${y}`}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13, fontVariantNumeric: "tabular-nums" }}
            />
            <Area type="monotone" dataKey="equity" stroke="#2563eb" strokeWidth={2.25} fill="url(#gEq)" />
            <Area type="monotone" dataKey="cumulativeCashFlow" stroke="#10b981" strokeWidth={2.25} fill="url(#gCf)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
