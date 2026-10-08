"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { FlipMarket } from "@/lib/flip/market";

/*
 * Pris pr. m² in the postnummer on one axis: a lane per condition (every
 * listing as a dot, the middle half as a band, the median as a tick), with
 * this home's asking price and the user's sale price as pins across all lanes.
 * The gap between the two pins is the renovation's lift the flip depends on.
 */

type Ok = Extract<FlipMarket, { ok: true }>;
const n0 = (n: number) => Math.round(n).toLocaleString("da-DK");

const LANES = [
  { key: "needs_work", label: "Trænger til renovering", dot: "#f59e0b", band: "#fef3c7", tick: "#b45309" },
  { key: "standard", label: "Standard", dot: "#64748b", band: "#e2e8f0", tick: "#334155" },
  { key: "renovated", label: "Renoveret", dot: "#10b981", band: "#d1fae5", tick: "#047857" },
] as const;

const q = (s: number[], p: number) => {
  if (!s.length) return null;
  const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function PriceLadder({ market, asking, target }: { market: FlipMarket; asking: number; target: number | null }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  if (!market.ok) return <p className="text-sm text-slate-500">Ingen sammenlignelige boliger til salg lige nu.</p>;
  const m = market as Ok;

  const lanes = LANES.map((l) => {
    const s = m.comps.filter((c) => c.condition === l.key).map((c) => c.perM2).sort((a, b) => a - b);
    return { ...l, n: s.length, med: q(s, 0.5), q1: q(s, 0.25), q3: q(s, 0.75) };
  }).filter((l) => l.med != null);
  // Axis: the middle halves of every lane plus both pins, rounded out to a
  // whole step, so the bands fill the width.
  const raw = [...lanes.flatMap((l) => [l.q1!, l.q3!]), asking, ...(target ? [target] : [])];
  const span = Math.max(...raw) - Math.min(...raw);
  const step = span > 16000 ? 5000 : span > 6000 ? 2000 : 1000;
  const lo = Math.max(0, Math.floor((Math.min(...raw) - step * 0.5) / step) * step);
  const hi = Math.ceil((Math.max(...raw) + step * 0.5) / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);

  const padX = 6;
  const iw = Math.max(1, W - padX * 2);
  const X = (v: number) => padX + ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * iw;
  const top = 58, laneH = 58;
  const H = top + lanes.length * laneH + 34;
  const lift = target && asking ? target - asking : null;

  // Flags: keep both inside the frame and apart from each other.
  const flagW = 104;
  const place = (x: number) => Math.min(Math.max(x - flagW / 2, 0), W - flagW);
  let ax = place(X(asking));
  let tx = target ? place(X(target)) : null;
  if (tx != null && Math.abs(tx - ax) < flagW + 6) {
    const mid = (ax + tx) / 2;
    const [l, r] = X(asking) <= X(target!) ? [mid - flagW / 2 - 3, mid + flagW / 2 + 3] : [mid + flagW / 2 + 3, mid - flagW / 2 - 3];
    ax = Math.min(Math.max(l, 0), W - flagW);
    tx = Math.min(Math.max(r, 0), W - flagW);
  }
  const Flag = ({ x, px, fill, title, value }: { x: number; px: number; fill: string; title: string; value: number }) => (
    <g>
      <g transform={`translate(${x},0)`}>
        <rect width={flagW} height="38" rx="7" fill={fill} />
        <text x={flagW / 2} y="15" fontSize="11" fill="#fff" fillOpacity="0.85" textAnchor="middle">{title}</text>
        <text x={flagW / 2} y="30" fontSize="12.5" fontWeight="600" fill="#fff" textAnchor="middle" className="tabular-nums">{n0(value)} kr.</text>
      </g>
      <path d={`M${px - 5},38 L${px + 5},38 L${px},44 Z`} fill={fill} />
    </g>
  );

  return (
    <div className="min-w-0">
      <div ref={ref} className="min-w-0">
        {W > 0 && (
          <svg width={W} height={H} className="block" role="img" aria-label={`Pris pr. m² i ${m.zip}: denne bolig ${n0(asking)} kr., renoverede i midten ${lanes.find((l) => l.key === "renovated")?.med ? n0(lanes.find((l) => l.key === "renovated")!.med!) : "ukendt"} kr.`}>
            {ticks.map((t) => (
              <line key={t} x1={X(t)} x2={X(t)} y1={top} y2={H - 30} stroke="#eef2f6" />
            ))}
            {/* Marker lines behind the lane labels; the flags go on top. */}
            <line x1={X(asking)} x2={X(asking)} y1={44} y2={H - 30} stroke="#0f172a" strokeWidth="1.5" strokeDasharray="4 3" />
            {target ? <line x1={X(target)} x2={X(target)} y1={44} y2={H - 30} stroke="#047857" strokeWidth="1.5" strokeDasharray="4 3" /> : null}
            {lanes.map((l, i) => {
              const y = top + i * laneH;
              const cy = y + 32;
              return (
                <g key={l.key}>
                  <text x={padX} y={y + 14} fontSize="13" fill="#475569" stroke="#fff" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">
                    {l.label}<tspan fill="#94a3b8" fontSize="12">{`  ${l.n} ${l.n === 1 ? "bolig" : "boliger"}`}</tspan>
                  </text>
                  <text x={W - padX} y={y + 14} fontSize="13" textAnchor="end" stroke="#fff" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round" className="tabular-nums">
                    <tspan fill={l.tick} fillOpacity="0.8">Median </tspan><tspan fill={l.tick} fontWeight="700">{n0(l.med!)}</tspan>
                  </text>
                  <rect x={padX} y={cy - 7} width={iw} height="14" rx="7" fill={l.band} fillOpacity="0.55" />
                  {l.n >= 3 && <rect x={X(l.q1!)} y={cy - 7} width={Math.max(14, X(l.q3!) - X(l.q1!))} height="14" rx="7" fill={l.dot} fillOpacity="0.45" />}
                  <circle cx={X(l.med!)} cy={cy} r="7" fill={l.tick} stroke="#fff" strokeWidth="2" />
                </g>
              );
            })}
            <Flag x={ax} px={X(asking)} fill="#0f172a" title="Denne bolig" value={asking} />
            {target && tx != null ? <Flag x={tx} px={X(target)} fill="#047857" title="Din salgspris" value={target} /> : null}
            {ticks.map((t, i) => (
              <g key={t}>
                <line x1={X(t)} x2={X(t)} y1={H - 30} y2={H - 25} stroke="#94a3b8" />
                <text x={X(t)} y={H - 10} fontSize="11.5" fill="#64748b" textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"} className="tabular-nums">
                  {iw / ticks.length < 70 && i % 2 === 1 ? "" : W < 480 ? n0(t) : `${n0(t)} kr.`}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
      {lift != null && (
        <p className="mt-4 flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-[14px] text-slate-800">
          <ArrowUpRight size={18} strokeWidth={2} className="shrink-0 text-blue-600" />
          <span>Planen kræver et løft på <b className={`font-semibold tabular-nums ${lift > 0 ? "text-blue-700" : "text-slate-900"}`}>{lift > 0 ? "+" : "−"}{n0(Math.abs(lift))} kr. pr. m²</b></span>
        </p>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
        Udbudspriser pr. m² for {m.sample} boliger til salg i {m.zip} af samme type og størrelse, sorteret efter hvad annoncen siger om standen. Det mørke felt er den midterste halvdel, prikken er medianen.
      </p>
    </div>
  );
}
