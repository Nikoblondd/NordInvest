"use client";

import { useEffect, useState } from "react";
import type { Verdict } from "@/lib/buyer/market";

export const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
/** 4.250.000 → "4,25 mio. kr" */
export const mio = (n: number) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("da-DK", { maximumFractionDigits: 2 })} mio. kr` : kr(n));
export const pct = (n: number, digits = 1) => `${n.toLocaleString("da-DK", { maximumFractionDigits: digits, minimumFractionDigits: 0 })} %`;

export const VERDICT_LABEL: Record<Verdict, string> = { godt: "Godt køb", middel: "Middel", dyrt: "Dyr" };
const STYLE: Record<Verdict, string> = {
  godt: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  middel: "bg-amber-50 text-amber-800 ring-amber-200",
  dyrt: "bg-rose-50 text-rose-800 ring-rose-200",
};
const DOT: Record<Verdict, string> = { godt: "bg-emerald-600", middel: "bg-amber-500", dyrt: "bg-rose-600" };

export function VerdictPill({ v, large = false }: { v: Verdict; large?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${STYLE[v]} ${large ? "px-3 py-1 text-[14px]" : "px-2 py-0.5 text-[12px]"}`}>
      <span className={`h-2 w-2 rounded-full ${DOT[v]}`} />{VERDICT_LABEL[v]}
    </span>
  );
}

/* Photos for the cards that are on screen, fetched in one go. */
const imageCache = new Map<string, string | null>();
export function useImages(ids: string[]) {
  const [, bump] = useState(0);
  const key = ids.join(",");
  useEffect(() => {
    const need = ids.filter((i) => !imageCache.has(i)).slice(0, 60);
    if (!need.length) return;
    need.forEach((i) => imageCache.set(i, null));
    fetch(`/api/boligkoeb/images?ids=${encodeURIComponent(need.join(","))}`).then((r) => r.json()).then((j) => { for (const [k, v] of Object.entries(j.images ?? {})) imageCache.set(k, v as string | null); bump((n) => n + 1); }).catch(() => {});
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return imageCache;
}


export function MailToggle({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span><span className="block text-[15px] font-semibold text-slate-900">{label}</span>{sub && <span className="block text-[13px] text-slate-500">{sub}</span>}</span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-300" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

