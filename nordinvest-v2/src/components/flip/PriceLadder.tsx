"use client";

import { useEffect, useRef, useState } from "react";
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
    return { ...l, values: s, med: q(s, 0.5), q1: q(s, 0.25), q3: q(s, 0.75) };
  });
  // Axis: the 5th to 95th percentile of every listing plus both pins, so one
  // odd listing can't squash the rest.
  const all = lanes.flatMap((l) => l.values).sort((a, b) => a - b);
  const pins = [asking, target ?? 0].filter((x) => x > 0);
  const raw = [q(all, 0.05) ?? asking, q(all, 0.95) ?? asking, ...pins];
  const step = (Math.max(...raw) - Math.min(...raw)) > 12000 ? 5000 : 2000;
  const lo = Math.floor((Math.min(...raw) * 0.97) / step) * step;
  const hi = Math.ceil((Math.max(...raw) * 1.03) / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += step) ticks.push(t);

  const padX = 8;
  const iw = Math.max(1, W - padX * 2);
  const X = (v: number) => padX + ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * iw;
  const top = 46, laneH = 46, laneGap = 6;
  const H = top + lanes.length * (laneH + laneGap) + 22;
  const lift = target && asking ? target - asking : null;

  // Pin labels: keep both inside the frame and apart from each other.
  const pinW = 112;
  const place = (x: number) => Math.min(Math.max(x - pinW / 2, 0), W - pinW);
  let ax = place(X(asking));
  let tx = target ? place(X(target)) : null;
  if (tx != null && Math.abs(tx - ax) < pinW + 6) {
    const mid = (ax + tx) / 2;
    const [l, r] = ax <= tx ? [mid - pinW / 2 - 3, mid + pinW / 2 + 3] : [mid + pinW / 2 + 3, mid - pinW / 2 - 3];
    ax = Math.min(Math.max(l, 0), W - pinW);
    tx = Math.min(Math.max(r, 0), W - pinW);
  }

  return (
    <div className="min-w-0">
      <div ref={ref} className="min-w-0">
        {W > 0 && (
          <svg width={W} height={H} className="block" role="img" aria-label={`Pris pr. m² i ${m.zip}: denne bolig ${n0(asking)} kr., renoverede i midten ${lanes[2].med ? n0(lanes[2].med) : "ukendt"} kr.`}>
            {ticks.map((t) => (
              <line key={t} x1={X(t)} x2={X(t)} y1={top - 4} y2={H - 20} stroke="#e2e8f0" strokeDasharray="2 3" />
            ))}
            {/* Pins across every lane, behind the labels and dots */}
            <line x1={X(asking)} x2={X(asking)} y1={30} y2={H - 20} stroke="#1e3a8a" strokeWidth="1.5" />
            {target ? <line x1={X(target)} x2={X(target)} y1={30} y2={H - 20} stroke="#065f46" strokeWidth="1.5" /> : null}
            {lanes.map((l, i) => {
              const y = top + i * (laneH + laneGap);
              const cy = y + 30;
              return (
                <g key={l.key}>
                  <text x={padX} y={y + 11} fontSize="12" fill="#334155" fontWeight="600" stroke="#fff" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">
                    {l.label}
                    <tspan fill="#94a3b8" fontWeight="400">{`  ${l.values.length} ${l.values.length === 1 ? "bolig" : "boliger"}`}</tspan>
                  </text>
                  {l.med != null && (
                    <text x={W - padX} y={y + 11} fontSize="12" fill={l.tick} fontWeight="600" textAnchor="end" stroke="#fff" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round" className="tabular-nums">{n0(l.med)} kr.</text>
                  )}
                  <line x1={padX} x2={W - padX} y1={cy} y2={cy} stroke="#f1f5f9" strokeWidth="1" />
                  {l.q1 != null && l.q3 != null && l.values.length >= 3 && (
                    <rect x={X(l.q1)} y={cy - 8} width={Math.max(4, X(l.q3) - X(l.q1))} height="16" rx="8" fill={l.band} />
                  )}
                  {l.values.map((v, k) => (
                    <circle key={k} cx={X(v)} cy={cy} r="3.25" fill={l.dot} fillOpacity="0.75" stroke="#fff" strokeWidth="1" />
                  ))}
                  {l.med != null && <rect x={X(l.med) - 1.5} y={cy - 11} width="3" height="22" rx="1.5" fill={l.tick} />}
                </g>
              );
            })}
            <g transform={`translate(${ax},0)`}>
              <rect width={pinW} height="26" rx="7" fill="#1e3a8a" />
              <text x={pinW / 2} y="17" fontSize="11.5" fontWeight="600" fill="#fff" textAnchor="middle" className="tabular-nums">Denne {n0(asking)}</text>
            </g>
            {target && tx != null ? (
              <g transform={`translate(${tx},0)`}>
                <rect width={pinW} height="26" rx="7" fill="#065f46" />
                <text x={pinW / 2} y="17" fontSize="11.5" fontWeight="600" fill="#fff" textAnchor="middle" className="tabular-nums">Salg {n0(target)}</text>
              </g>
            ) : null}
            {ticks.map((t, i) => (
              <text key={t} x={X(t)} y={H - 4} fontSize="11" fill="#64748b" textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"} className="tabular-nums">
                {iw / ticks.length < 56 && i % 2 === 1 && i !== ticks.length - 1 ? "" : n0(t)}
              </text>
            ))}
          </svg>
        )}
      </div>
      {lift != null && (
        <p className="mt-3 text-[14px] text-slate-700">
          Planen kræver et løft på <span className={`font-semibold tabular-nums ${lift > 0 ? "text-emerald-700" : "text-slate-900"}`}>{lift > 0 ? "+" : "−"}{n0(Math.abs(lift))} kr. pr. m²</span>
          {lanes[2].med ? <> fra boligens pris til din salgspris. Renoverede boliger ligger i midten på {n0(lanes[2].med)} kr.</> : "."}
        </p>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
        Udbudspris pr. m² for {m.sample} boliger til salg i {m.zip} af samme type og størrelse. Hver prik er en bolig, sorteret efter hvad dens egen annonce siger om standen. Det farvede felt er den midterste halvdel.
      </p>
    </div>
  );
}
