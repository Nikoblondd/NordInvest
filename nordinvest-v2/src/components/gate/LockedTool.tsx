import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { Suspense } from "react";
import { TryButton } from "@/components/landing/TryModal";
import { HaveAccount } from "@/components/auth/HaveAccount";

/*
 * What visitors see where a member tool lives (analyser, Deal-motor): what the
 * tool does, that it is part of NordInvest with access after a conversation,
 * and the free calculator. Server-rendered, so search engines keep the page.
 */
export function LockedTool({ title, lead, h1 = true }: { title: string; lead: string; h1?: boolean }) {
  const H = h1 ? "h1" : "h2";
  return (
    <section className="px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
      <div className="mx-auto max-w-[1080px]">
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] font-medium text-slate-600"><Lock size={13} className="text-blue-600" /> For medlemmer af NordInvest</p>
        <H className="mt-5 max-w-3xl text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-[#17213a] [text-wrap:balance] sm:text-[60px]">{title}</H>
        <p className="mt-5 max-w-2xl text-[19px] leading-relaxed text-slate-600">{lead}</p>
        <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
          <Link href="/adgang" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-[16px] font-semibold text-white hover:bg-blue-500">Anmod om adgang <ArrowRight size={17} /></Link>
          <TryButton className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-[16px] font-semibold text-slate-800 hover:border-slate-400">Prøv en gratis beregning</TryButton>
        </div>
        <Suspense><HaveAccount className="mt-4" /></Suspense>
      </div>
    </section>
  );
}
