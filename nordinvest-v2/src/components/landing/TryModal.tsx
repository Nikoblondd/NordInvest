"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { QuickTest } from "./QuickTest";

/* "Prøv en beregning": the free test in a dialog, so the visitor stays where they are. */
export function TryButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); document.body.style.overflow = "hidden"; }
    if (!open && d.open) d.close();
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{children}</button>
      <dialog ref={ref} onClose={() => { setOpen(false); document.body.style.overflow = ""; }} onClick={(e) => { if (e.target === ref.current) setOpen(false); }}
        aria-label="Prøv en beregning"
        className="m-auto w-[min(640px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl bg-transparent p-0 backdrop:bg-[#0b1b33]/60 backdrop:backdrop-blur-sm">
        {open && (
          <div className="relative">
            <button type="button" aria-label="Luk" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X size={18} /></button>
            <QuickTest />
          </div>
        )}
      </dialog>
    </>
  );
}
