"use client";
/* eslint-disable @next/next/no-img-element -- photos come from the estate agents' own image servers */

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

/*
 * The listing's photos and floor plans, flicked through in place: arrows,
 * a swipe, or the keyboard in full screen. Loaded once per home and kept.
 */
type Img = { url: string; kind: "foto" | "plan" };
const cache = new Map<string, Promise<Img[]>>();
function load(id: string, fallback: string | null): Promise<Img[]> {
  if (!cache.has(id)) {
    cache.set(id, fetch(`/api/boligkoeb/gallery?id=${encodeURIComponent(id)}`).then((r) => r.json()).then((j) => (j.ok && j.images?.length ? (j.images as Img[]) : fallback ? [{ url: fallback, kind: "foto" as const }] : [])).catch(() => (fallback ? [{ url: fallback, kind: "foto" as const }] : [])));
  }
  return cache.get(id)!;
}

export function Gallery({ id, fallback, alt, badge }: { id: string; fallback: string | null; alt: string; badge?: React.ReactNode }) {
  const [imgs, setImgs] = useState<Img[] | null>(null);
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  useEffect(() => { let live = true; setImgs(null); setI(0); load(id, fallback).then((v) => live && setImgs(v)); return () => { live = false; }; }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = imgs ?? (fallback ? [{ url: fallback, kind: "foto" as const }] : []);
  const n = list.length;
  const go = (d: number) => setI((c) => (n ? (c + d + n) % n : 0));
  const x0 = useRef(0);
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => { x0.current = e.touches[0].clientX; },
    onTouchEnd: (e: React.TouchEvent) => { const dx = e.changedTouches[0].clientX - x0.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); },
  };
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); if (e.key === "Escape") setFull(false); };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = list[Math.min(i, Math.max(0, n - 1))];
  const arrow = "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur hover:bg-white";

  return (
    <>
      <div className="group relative aspect-[16/10] w-full select-none overflow-hidden bg-slate-100" {...swipe}>
        {cur ? <img key={cur.url} src={cur.url} alt={`${alt}, billede ${i + 1} af ${n}`} className={`h-full w-full ${cur.kind === "plan" ? "bg-white object-contain p-3" : "object-cover"}`} onClick={() => setFull(true)} /> : <div className="flex h-full items-center justify-center text-slate-300"><Building2 size={36} /></div>}
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Forrige billede" className={`${arrow} left-2.5`}><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => go(1)} aria-label="Næste billede" className={`${arrow} right-2.5`}><ChevronRight size={20} /></button>
          </>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          <span className="flex gap-1.5">{badge}{cur?.kind === "plan" && <span className="rounded-lg bg-slate-900/80 px-2 py-1 text-[12px] font-semibold text-white">Plantegning</span>}</span>
          {n > 1 && <span className="rounded-full bg-slate-900/70 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-white">{i + 1} / {n}{imgs == null ? " …" : ""}</span>}
        </div>
        {cur && <button type="button" onClick={() => setFull(true)} aria-label="Vis billeder i fuld skærm" className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 opacity-0 shadow transition-opacity group-hover:opacity-100"><Expand size={16} /></button>}
      </div>
      {full && cur && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95" onClick={() => setFull(false)} {...swipe}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-[14px] font-semibold tabular-nums">{i + 1} / {n}{cur.kind === "plan" ? " · Plantegning" : ""}</span>
            <button type="button" onClick={() => setFull(false)} aria-label="Luk" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"><X size={22} /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6" onClick={(e) => e.stopPropagation()}>
            <img src={cur.url} alt={`${alt}, billede ${i + 1} af ${n}`} className={`max-h-full max-w-full rounded-lg ${cur.kind === "plan" ? "bg-white p-4" : ""}`} />
            {n > 1 && <button type="button" onClick={() => go(-1)} aria-label="Forrige billede" className={`${arrow} left-4 h-12 w-12`}><ChevronLeft size={24} /></button>}
            {n > 1 && <button type="button" onClick={() => go(1)} aria-label="Næste billede" className={`${arrow} right-4 h-12 w-12`}><ChevronRight size={24} /></button>}
          </div>
        </div>
      )}
    </>
  );
}
