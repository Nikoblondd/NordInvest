"use client";

import { useEffect, useRef, useState } from "react";
import { Landmark } from "lucide-react";
import type { VurResult } from "@/lib/vur";

/*
 * Skattestyrelsens offentlige ejendomsvurdering for the home, from
 * Datafordeler, against the asking price. The history is drawn as a step line
 * (a valuation holds until the next one), with the asking price as a dashed
 * reference so the gap is visible at a glance. Not a sale price: it is the
 * tax authority's value.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const mio = (n: number) => `${(n / 1e6).toLocaleString("da-DK", { minimumFractionDigits: n < 1e7 ? 2 : 1, maximumFractionDigits: n < 1e7 ? 2 : 1 })} mio.`;

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

// Round tick values (1, 2, 2.5, 5 × 10^n) covering [lo, hi].
function ticks(lo: number, hi: number, count = 3) {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 0.01; v += step) out.push(v);
  if (out[out.length - 1] < hi) out.push(out[out.length - 1] + step);
  return out;
}

export function Valuation({ bfe, price, area }: { bfe: number | null | undefined; price: number; area?: number | null }) {
  const [v, setV] = useState<VurResult | null>(null);
  useEffect(() => {
    if (!bfe) return;
    let off = false;
    fetch(`/api/property/vurdering?bfe=${bfe}`)
      .then((r) => r.json())
      .then((d) => { if (!off && d?.ok) setV(d as VurResult); })
      .catch(() => {});
    return () => { off = true; };
  }, [bfe]);
  if (!v || !v.latest.propertyValue) return null;

  const pv = v.latest.propertyValue;
  const land = v.latest.landValue && v.latest.landValue < pv ? v.latest.landValue : null;
  const diff = price > 0 ? (price - pv) / pv : 0;
  const pts = v.history.filter((h) => h.propertyValue) as { year: number; propertyValue: number }[];
  const tone = diff <= -0.05 ? "text-emerald-700" : diff >= 0.15 ? "text-amber-600" : "text-slate-900";

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-6">
        <Landmark size={20} strokeWidth={1.6} className="shrink-0 text-slate-500" />
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-tight text-slate-900">Offentlig ejendomsvurdering</h3>
          <p className="text-[12px] text-slate-500">Kilde: Datafordeler · Skattestyrelsen</p>
        </div>
      </div>

      <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-8">
        <div className="min-w-0">
          <p className="text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-slate-900 sm:text-[32px]">{kr(pv)}</p>
          <p className="mt-2 text-[13px] text-slate-500">Ejendomsværdi {v.latest.year}</p>
          {land != null && (
            <div className="mt-5">
              <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                <span className="bg-emerald-500" style={{ width: `${(land / pv) * 100}%` }} />
                <span className="ml-0.5 flex-1 bg-slate-700" />
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-2 text-[13px]">
                <div>
                  <dt className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" />Grund</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{kr(land)}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-slate-500"><span className="h-2 w-2 rounded-full bg-slate-700" />Bygning</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{kr(pv - land)}</dd>
                </div>
              </dl>
              {v.latest.lotArea ? <p className="mt-2 text-[12px] text-slate-500">Grund {v.latest.lotArea.toLocaleString("da-DK")} m²</p> : null}
            </div>
          )}
        </div>
        {pts.length > 1 ? <HistoryChart pts={pts} price={price} /> : <div className="hidden md:block" />}
      </div>

      <dl className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
        <div className="min-w-0 px-3 py-3.5 sm:px-6">
          <dt className="text-[12px] text-slate-500">Udbudspris</dt>
          <dd className="mt-0.5 truncate text-[14px] font-semibold tabular-nums text-slate-900 sm:text-[17px]">{price > 0 ? kr(price) : "Ukendt"}</dd>
        </div>
        <div className="min-w-0 px-3 py-3.5 sm:px-6">
          <dt className="text-[12px] text-slate-500">{diff < 0 ? "Under vurdering" : "Over vurdering"}</dt>
          <dd className={`mt-0.5 text-[14px] font-semibold tabular-nums sm:text-[17px] ${tone}`}>{price > 0 ? `${Math.abs(Math.round(diff * 100))} %` : "–"}</dd>
        </div>
        <div className="min-w-0 px-3 py-3.5 sm:px-6">
          <dt className="text-[12px] text-slate-500">{area ? "Pr. m²" : "Vurderet år"}</dt>
          <dd className="mt-0.5 truncate text-[14px] font-semibold tabular-nums text-slate-900 sm:text-[17px]">{area ? kr(pv / area) : v.latest.year}</dd>
        </div>
      </dl>
      <p className="border-t border-slate-100 px-4 py-3 text-[12px] leading-relaxed text-slate-500 sm:px-6">
        Den værdi, ejendomsværdiskat og grundskyld beregnes af. Vurderingerne har stået stille i mange år, så en stor forskel er normal. Den er ikke en salgspris.
      </p>
    </div>
  );
}

function HistoryChart({ pts, price }: { pts: { year: number; propertyValue: number }[]; price: number }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 184;
  const padL = 4, padR = 56, padT = 26, padB = 26;
  const vals = pts.map((p) => p.propertyValue);
  // Show the asking price only when it sits within reach of the history; a
  // price ten times the valuation would flatten the line into nothing.
  const showPrice = price > 0 && price < Math.max(...vals) * 3;
  const lo = Math.min(...vals), hi = Math.max(...vals, showPrice ? price : 0);
  const tk = ticks(lo * 0.9, hi);
  const y0 = tk[0], y1 = tk[tk.length - 1];
  const first = pts[0].year, last = pts[pts.length - 1].year;
  const span = Math.max(1, last - first + 1);
  const iw = Math.max(1, W - padL - padR), ih = H - padT - padB;
  const X = (year: number) => padL + ((year - first) / span) * iw;
  const Y = (val: number) => padT + ih - ((val - y0) / (y1 - y0)) * ih;

  // Step line: each valuation holds until the next year's.
  let d = "";
  pts.forEach((p, i) => {
    const x0 = X(p.year), x1 = X(i < pts.length - 1 ? pts[i + 1].year : last + 1), y = Y(p.propertyValue);
    d += `${i ? "L" : "M"}${x0.toFixed(1)},${y.toFixed(1)} L${x1.toFixed(1)},${y.toFixed(1)} `;
  });
  const area = `${d} L${X(last + 1).toFixed(1)},${padT + ih} L${X(first).toFixed(1)},${padT + ih} Z`;
  const yearTicks = (() => {
    const step = span > 14 ? 5 : span > 6 ? 2 : 1;
    const out = [first];
    for (let y = Math.ceil((first + 1) / step) * step; y < last; y += step) if (y - first >= step * 0.6 && last - y >= step * 0.6) out.push(y);
    out.push(last);
    return out;
  })();
  const active = hover != null ? pts[hover] : pts[pts.length - 1];
  const ax = X(active.year) + (X(Math.min(active.year + 1, last + 1)) - X(active.year)) / 2;
  const ay = Y(active.propertyValue);
  const label = `${active.year}: ${mio(active.propertyValue)}`;
  const lw = label.length * 6.4 + 16;
  const lx = Math.min(Math.max(ax - lw / 2, padL), padL + iw - lw);

  const onMove = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const year = first + ((clientX - r.left - padL) / iw) * span;
    let i = pts.findIndex((p, k) => k === pts.length - 1 || pts[k + 1].year > year);
    if (i < 0) i = 0;
    setHover(i);
  };

  return (
    <div ref={ref} className="min-w-0">
      {W > 0 && (
        <svg
          width={W} height={H} className="block touch-pan-y select-none" role="img"
          aria-label={`Ejendomsværdien fra ${first} til ${last}: fra ${kr(pts[0].propertyValue)} til ${kr(pts[pts.length - 1].propertyValue)}`}
          onMouseMove={(e) => onMove(e.clientX, e.currentTarget)} onMouseLeave={() => setHover(null)}
          onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget)} onTouchMove={(e) => onMove(e.touches[0].clientX, e.currentTarget)} onTouchEnd={() => setHover(null)}
        >
          <defs>
            <linearGradient id="vur-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#1e3a8a" stopOpacity="0.14" />
              <stop offset="1" stopColor="#1e3a8a" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {tk.map((t) => (
            <g key={t}>
              <line x1={padL} x2={padL + iw} y1={Y(t)} y2={Y(t)} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padL + iw + 8} y={Y(t) + 4} fontSize="11" fill="#64748b" className="tabular-nums">{mio(t).replace(",00", "")}</text>
            </g>
          ))}
          {showPrice && (
            <g>
              {price > pts[pts.length - 1].propertyValue && (
                <rect x={padL} y={Y(price)} width={iw} height={Y(pts[pts.length - 1].propertyValue) - Y(price)} fill="#2563eb" opacity="0.05" />
              )}
              <line x1={padL} x2={padL + iw} y1={Y(price)} y2={Y(price)} stroke="#2563eb" strokeWidth="1.25" strokeDasharray="4 4" />
              <text x={padL + 2} y={price >= pts[0].propertyValue ? Y(price) - 7 : Y(price) + 16} fontSize="12" fontWeight="600" fill="#2563eb" stroke="#fff" strokeWidth="4" paintOrder="stroke" strokeLinejoin="round">Udbudspris {mio(price)}</text>
            </g>
          )}
          <path d={area} fill="url(#vur-fill)" />
          <path d={d} fill="none" stroke="#1e293b" strokeWidth="1.75" strokeLinejoin="round" />
          <line x1={ax} x2={ax} y1={ay} y2={padT + ih} stroke="#1e293b" strokeOpacity="0.15" />
          <circle cx={ax} cy={ay} r="4" fill="#1e293b" stroke="#fff" strokeWidth="2" />
          <g transform={`translate(${lx},${Math.max(2, ay - 34)})`}>
            <rect width={lw} height="22" rx="6" fill="#0f172a" />
            <text x={lw / 2} y="15" fontSize="11.5" fontWeight="600" fill="#fff" textAnchor="middle" className="tabular-nums">{label}</text>
          </g>
          {yearTicks.map((y, i) => (
            <text key={y} x={i === yearTicks.length - 1 ? padL + iw : X(y)} y={H - 6} fontSize="11" fill="#64748b" textAnchor={i === 0 ? "start" : i === yearTicks.length - 1 ? "end" : "middle"}>{y}</text>
          ))}
        </svg>
      )}
    </div>
  );
}
