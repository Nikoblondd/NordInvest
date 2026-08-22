"use client";

import { useState } from "react";
import { clsx } from "@/lib/clsx";

export function Accordion({
  items,
}: {
  items: { q: string; a: string }[];
}) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q}>
            <button
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="font-medium text-stone-900">{it.q}</span>
              <span
                className={clsx(
                  "text-gold-500 transition-transform",
                  isOpen && "rotate-45",
                )}
              >
                +
              </span>
            </button>
            <div
              className={clsx(
                "grid overflow-hidden px-6 transition-all duration-300 ease-standard",
                isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]",
              )}
            >
              <p className="min-h-0 text-stone-600">{it.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
