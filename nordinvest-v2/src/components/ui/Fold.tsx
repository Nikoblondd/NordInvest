"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/*
 * Shortens long sections on phones only. Inside a Fold, elements marked
 * `more-row` (extra list rows) or `fold-body` (a whole block) are hidden below
 * 640 px until the button is tapped; on larger screens everything shows and the
 * button is gone. The content stays in the HTML, so search engines still read it.
 */
export function Fold({ label, labelOpen = "Vis mindre", children, className = "" }: { label: string; labelOpen?: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`fold ${open ? "open" : ""} ${className}`}>
      {children}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-[16px] font-semibold text-slate-900 active:translate-y-px sm:hidden"
      >
        {open ? labelOpen : label}
        <ChevronDown aria-hidden size={18} className={open ? "rotate-180" : ""} />
      </button>
    </div>
  );
}
