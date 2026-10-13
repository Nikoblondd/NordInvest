"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, Check, ExternalLink, Loader2, TrendingDown, X } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { Hit } from "@/lib/app/agents";
import { PropertyImage } from "../PropertyImage";

/* One listing an agent found: the numbers, and what the member can do with it. */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const ago = (iso: string) => {
  const h = Math.round((Date.now() - Date.parse(iso)) / 3600000);
  return h < 1 ? "lige nu" : h < 24 ? `for ${h} t. siden` : h < 48 ? "i går" : `for ${Math.round(h / 24)} dage siden`;
};

export function HitCard({ h, busy, onSave, onDismiss, onRestore, compact }: {
  h: Hit; busy?: boolean; onSave: () => void; onDismiss: () => void; onRestore?: () => void; compact?: boolean;
}) {
  const cfTone = h.cashFlow >= 0 ? "text-emerald-700" : "text-rose-600";
  return (
    <article className={clsx("flex gap-3 rounded-2xl border bg-white p-3 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)]", h.status === "ny" ? "border-blue-200" : "border-slate-200", h.status === "afvist" && "opacity-60")}>
      <Link href={h.href} className="relative h-[84px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-[96px] sm:w-[136px]">
        <PropertyImage src={h.image} />
        {h.status === "ny" && <span className="absolute left-1.5 top-1.5 rounded-md bg-blue-600 px-1.5 py-0.5 text-[12px] font-bold text-white">Ny</span>}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={h.href} className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-slate-900 hover:text-blue-700">{h.road}</p>
            <p className="truncate text-[13px] text-slate-500">{h.zip} {h.city}{h.area ? ` · ${h.area} m²` : ""}{h.rooms ? ` · ${h.rooms} vær.` : ""}</p>
          </Link>
          <span className={clsx("shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-bold tabular-nums", h.score >= 65 ? "bg-emerald-50 text-emerald-700" : h.score >= 45 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700")}>{h.score}</span>
        </div>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[14px]">
          <b className="font-semibold tabular-nums text-slate-900">{kr(h.price)}</b>
          <span className={clsx("font-semibold tabular-nums", cfTone)}>{h.cashFlow >= 0 ? "+" : "-"}{Math.round(Math.abs(h.cashFlow)).toLocaleString("da-DK")} kr./md.</span>
          <span className="tabular-nums text-slate-500">{h.capRate.toLocaleString("da-DK", { maximumFractionDigits: 1 })} % afkast</span>
          {h.priceChangePct != null && h.priceChangePct < 0 && <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-emerald-700"><TrendingDown size={12} /> {Math.round(h.priceChangePct)} %</span>}
        </p>
        {!compact && <p className="mt-0.5 text-[12px] text-slate-400">{h.fresh ? `Fundet ${ago(h.foundAt)}` : "På markedet, da agenten startede"} · {h.source}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {h.status === "gemt" ? (
            <Link href={h.savedId ? `/app/ejendomme/${h.savedId}` : "/app/ejendomme"} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-100"><Check size={14} /> I pipeline, åbn sagen</Link>
          ) : h.status === "afvist" ? (
            onRestore && <button type="button" onClick={onRestore} className="inline-flex min-h-[36px] items-center rounded-lg px-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">Fortryd</button>
          ) : (
            <button type="button" onClick={onSave} disabled={busy} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[13px] font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />} Gem i pipeline
            </button>
          )}
          <Link href={h.href} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[13px] font-semibold text-slate-700 hover:border-slate-300">Analysér <ArrowUpRight size={13} /></Link>
          {h.url && !compact && <a href={h.url} target="_blank" rel="noopener noreferrer" className="hidden min-h-[36px] items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-slate-500 hover:text-slate-800 sm:inline-flex">Annoncen <ExternalLink size={12} /></a>}
          {h.status !== "gemt" && h.status !== "afvist" && <button type="button" onClick={onDismiss} aria-label={`Afvis ${h.road}`} className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button>}
        </div>
      </div>
    </article>
  );
}
