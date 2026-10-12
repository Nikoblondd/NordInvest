"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Link as LinkIcon } from "lucide-react";

// The strategy questions open on top of the page, loaded when needed.
const JourneyModal = dynamic(() => import("@/components/journey/Journey").then((m) => m.JourneyModal), { ssr: false });

/** Start of an analysis inside the app: paste a listing link, choose the plan. */
export function AnalyseStart() {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const go = () => {
    const u = url.trim();
    if (/^https?:\/\/\S+\.\S+/i.test(u)) { setErr(false); setOpen(u); } else setErr(true);
  };
  return (
    <div data-tour="analyse-start" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-[18px] font-semibold">Indsæt et boliglink</h2>
      <p className="mt-1 text-[15px] text-slate-500">Fra Boligsiden, Home, EDC, Nybolig, Danbolig eller Ejendomstorvet. Vi henter tallene, og du vælger din plan.</p>
      <form onSubmit={(e) => { e.preventDefault(); go(); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="analyse-link" className="sr-only">Link til boligen</label>
        <div className={`flex h-12 flex-1 items-center gap-2 rounded-lg border px-3 focus-within:ring-2 ${err ? "border-rose-400 focus-within:ring-rose-100" : "border-slate-300 focus-within:border-blue-600 focus-within:ring-blue-100"}`}>
          <LinkIcon size={17} className="shrink-0 text-slate-400" />
          <input id="analyse-link" value={url} onChange={(e) => { setUrl(e.target.value); setErr(false); }} placeholder="https://www.boligsiden.dk/..." inputMode="url" autoComplete="off"
            aria-invalid={err} aria-describedby={err ? "analyse-link-err" : undefined} className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-slate-400" />
        </div>
        <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-[15px] font-semibold text-white hover:bg-blue-500">Analysér <ArrowRight size={16} /></button>
      </form>
      {err && <p id="analyse-link-err" className="mt-2 text-[14px] font-medium text-rose-600">Indsæt hele linket til boligen, der starter med https://</p>}
      {open && <JourneyModal url={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
