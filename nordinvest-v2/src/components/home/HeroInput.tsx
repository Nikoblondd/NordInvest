"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { captureEvent } from "@/lib/analytics-events";
import { Link as LinkIcon, ArrowUpRight } from "lucide-react";

// The question flow opens on top of the page; loaded on demand to keep the page light.
const JourneyModal = dynamic(() => import("@/components/journey/Journey").then((m) => m.JourneyModal), { ssr: false });

export function HeroInput() {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const router = useRouter();

  const go = () => {
    captureEvent("analyze_started", { fromLink: url.trim().length > 0 });
    if (/^https?:\/\//i.test(url.trim())) setOpen(url.trim());
    else router.push("/analyseren");
  };

  return (
    <div className="relative z-10 flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/50 md:flex-row md:p-3">
      <div className="relative flex flex-1 items-center">
        <LinkIcon className="absolute left-4 text-slate-400" size={20} />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Indsæt link til ejendom..."
          className="h-12 w-full border-none bg-transparent pl-12 pr-4 font-medium text-slate-900 placeholder:text-slate-400 outline-none md:h-14"
        />
      </div>
      <button
        onClick={go}
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-all hover:bg-blue-700 md:h-14"
      >
        Få analysen <ArrowUpRight size={18} />
      </button>
      {open && <JourneyModal url={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
