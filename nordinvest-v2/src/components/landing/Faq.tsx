"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(1);
  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.q}>
            <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : i)} className="flex min-h-[64px] w-full items-center justify-between gap-6 py-4 text-left">
              <span className="text-[17px] font-semibold text-slate-900">{it.q}</span>
              <Plus size={20} className={`shrink-0 text-blue-600 transition-transform ${on ? "rotate-45" : ""}`} />
            </button>
            {on && <p className="-mt-1 max-w-[62ch] pb-5 text-[16px] leading-relaxed text-slate-600">{it.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
