"use client";

import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import type { VurResult } from "@/lib/vur";

/*
 * Skattestyrelsens offentlige ejendomsvurdering for the home, from
 * Datafordeler, against the asking price, with the valuation history as a
 * small line. Not a sale price: it is the tax authority's value.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;

export function Valuation({ bfe, price }: { bfe: number | null | undefined; price: number }) {
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
  const diff = price > 0 ? (price - pv) / pv : 0;
  const pts = v.history.filter((h) => h.propertyValue);
  const max = Math.max(...pts.map((h) => h.propertyValue!));
  const min = Math.min(...pts.map((h) => h.propertyValue!));
  const W = 220, H = 48;
  const x = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * W : W / 2);
  const y = (val: number) => H - 12 - ((val - min) / Math.max(1, max - min)) * (H - 18);
  const path = pts.map((h, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(h.propertyValue!).toFixed(1)}`).join(" ");

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Landmark size={16} className="text-slate-500" />
        <h3 className="text-[15px] font-semibold text-slate-900">Offentlig ejendomsvurdering</h3>
        <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Datafordeler</span>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-slate-500">Ejendomsværdi {v.latest.year}</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">{kr(pv)}</p>
          {v.latest.landValue ? (
            <p className="text-[13px] tabular-nums text-slate-500">
              Heraf grundværdi {kr(v.latest.landValue)}
              {v.latest.lotArea ? ` · grund ${v.latest.lotArea.toLocaleString("da-DK")} m²` : ""}
            </p>
          ) : null}
        </div>
        {pts.length > 1 && (
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="max-w-full" role="img" aria-label={`Vurderingen fra ${pts[0].year} til ${pts[pts.length - 1].year}`}>
            <path d={path} fill="none" stroke="#64748b" strokeWidth="1.8" />
            <circle cx={x(pts.length - 1)} cy={y(pv)} r="3" fill="#0f172a" />
            <text x="0" y={H - 1} fontSize="10" fill="#94a3b8">{pts[0].year}</text>
            <text x={W} y={H - 1} fontSize="10" fill="#94a3b8" textAnchor="end">{pts[pts.length - 1].year}</text>
          </svg>
        )}
      </div>
      <p className={`mt-4 text-sm font-semibold ${diff <= -0.05 ? "text-emerald-700" : diff >= 0.15 ? "text-amber-700" : "text-slate-700"}`}>
        {Math.abs(diff) < 0.03
          ? "Udbudsprisen ligger på niveau med vurderingen."
          : `Udbudsprisen ligger ${Math.round(Math.abs(diff) * 100)} % ${diff < 0 ? "under" : "over"} vurderingen.`}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Skattestyrelsens vurdering, som ejendomsværdiskat og grundskyld beregnes af. Den er ikke en salgspris, men en stor forskel er værd at forstå, før du byder.
      </p>
    </div>
  );
}
