"use client";

import { CircleHelp } from "lucide-react";
import { startTour } from "./Tour";

export function GuideButton() {
  return (
    <button type="button" onClick={startTour} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[15px] font-semibold text-slate-800 hover:border-slate-400">
      <CircleHelp size={16} /> Vis guiden igen
    </button>
  );
}
