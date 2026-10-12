"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { TryButton } from "@/components/landing/TryModal";
import { captureEvent } from "@/lib/analytics-events";

/*
 * In-article call to action. The analyser is closed, so instead of a link
 * field this offers the free calculator right here and the way to access.
 */
export function AnalyzeInline({ from, title, dark }: { from: string; title: string; sub?: string; dark?: boolean }) {
  return (
    <div className={clsx("not-prose rounded-2xl p-5 sm:p-6", dark ? "bg-white/5 ring-1 ring-inset ring-white/10" : "border border-slate-200 bg-white shadow-card")}>
      <p className={clsx("text-[17px] font-semibold tracking-[-0.01em]", dark ? "text-white" : "text-slate-900")}>{title}</p>
      <p className={clsx("mt-1 text-[15px] leading-relaxed", dark ? "text-white/65" : "text-slate-600")}>Regn en bolig igennem med pris, husleje og ejerudgift, gratis og uden login. Hele analysen er en del af NordInvest, som du får adgang til efter en kort samtale.</p>
      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <TryButton className={clsx("inline-flex min-h-[46px] items-center justify-center rounded-lg px-4 text-[15px] font-semibold", dark ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-blue-600 text-white hover:bg-blue-500")}>Prøv en gratis beregning</TryButton>
        <Link href={`/adgang?kilde=${encodeURIComponent(from).slice(0, 40)}`} onClick={() => captureEvent("access_cta", { from })} className={clsx("inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-lg border px-4 text-[15px] font-semibold", dark ? "border-white/25 text-white hover:border-white/50" : "border-slate-300 text-slate-800 hover:border-slate-400")}>Anmod om adgang <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}
