"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TryButton } from "@/components/landing/TryModal";

/*
 * Used to be the link field that opened the analyser. The analyser is closed
 * now, so public pages offer the free calculator and the way to access.
 */
export function HeroInput() {
  return (
    <div className="relative z-10 grid w-full max-w-2xl gap-3 sm:flex sm:flex-wrap">
      <Link href="/adgang" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-[16px] font-semibold text-white hover:bg-blue-500">Anmod om adgang <ArrowRight size={17} /></Link>
      <TryButton className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-[16px] font-semibold text-slate-800 hover:border-slate-400">Prøv en gratis beregning</TryButton>
    </div>
  );
}
