"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link as LinkIcon } from "lucide-react";
import { captureEvent } from "@/lib/analytics-events";
import { clsx } from "@/lib/clsx";

/**
 * Paste-a-link box inside and after articles. The blog's job in the funnel is
 * the first analysis (that is where NordInvest proves itself), not a sale, so
 * the action here is "regn på en bolig", right where the reader is.
 */
export function AnalyzeInline({ from, title, sub, dark }: { from: string; title: string; sub: string; dark?: boolean }) {
  const [url, setUrl] = useState("");
  const router = useRouter();
  const go = () => {
    captureEvent("analyze_started", { from, fromLink: url.trim().length > 0 });
    router.push(`/analyseren${url.trim() ? `?url=${encodeURIComponent(url.trim())}` : ""}`);
  };
  return (
    <div className={clsx("not-prose rounded-2xl p-5 sm:p-6", dark ? "bg-white/5 ring-1 ring-inset ring-white/10" : "border border-slate-200 bg-white shadow-card")}>
      <p className={clsx("text-[17px] font-semibold tracking-[-0.01em]", dark ? "text-white" : "text-slate-900")}>{title}</p>
      <p className={clsx("mt-1 text-[15px] leading-relaxed", dark ? "text-white/65" : "text-slate-600")}>{sub}</p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <label className="relative flex-1">
          <span className="sr-only">Link til en bolig</span>
          <LinkIcon aria-hidden size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Indsæt link til boligen…"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[16px] text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </label>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[15px] font-semibold text-white shadow-btn transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Regn den igennem <ArrowRight aria-hidden size={16} />
        </button>
      </form>
    </div>
  );
}
