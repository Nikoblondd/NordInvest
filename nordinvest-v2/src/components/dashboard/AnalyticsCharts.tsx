"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { DayPoint } from "@/lib/analytics-data";

const fmtDay = (d: string) => {
  const [, m, day] = d.split("-");
  return `${Number(day)}/${Number(m)}`;
};

export function AnalyticsCharts({ series }: { series: DayPoint[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Nye brugere" subtitle="Tilmeldinger pr. dag (30 dage)" data={series} dataKey="signups" color="#2563eb" />
      <ChartCard title="Analyser kørt" subtitle="Brug af værktøjet pr. dag (30 dage)" data={series} dataKey="analyses" color="#10b981" />
    </div>
  );
}

function ChartCard({ title, subtitle, data, dataKey, color }: { title: string; subtitle: string; data: DayPoint[]; dataKey: "signups" | "analyses"; color: string }) {
  const total = data.reduce((s, d) => s + d[dataKey], 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-400">{subtitle}</div>
        </div>
        <div className="text-2xl font-bold tabular-nums text-slate-900">{total}</div>
      </div>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11, fill: "#94a3b8" }} interval={5} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              labelFormatter={(d) => fmtDay(String(d))}
              formatter={(v) => [`${v}`, title]}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
            />
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#g-${dataKey})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
