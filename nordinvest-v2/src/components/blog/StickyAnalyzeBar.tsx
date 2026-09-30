"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { captureEvent } from "@/lib/analytics-events";

const KEY = "ni_blogbar_closed";

/**
 * Phones only: after a quarter of the article, a slim bar offers the analyser.
 * Hidden while the cookie banner is up, once the end-of-article box is on
 * screen, and for the rest of the visit once closed.
 */
export function StickyAnalyzeBar({ slug, endId }: { slug: string; endId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let closed = false;
    try { closed = sessionStorage.getItem(KEY) === "1"; } catch { /* blocked */ }
    if (closed) return;
    let endVisible = false;
    const end = document.getElementById(endId);
    const io = end ? new IntersectionObserver(([e]) => { endVisible = e.isIntersecting; update(); }) : null;
    if (end && io) io.observe(end);
    function update() {
      let consent = true;
      try { const v = localStorage.getItem("ni_consent"); consent = v === "accepted" || v === "declined"; } catch { /* blocked */ }
      const past = window.scrollY > document.documentElement.scrollHeight * 0.25;
      setShow(consent && past && !endVisible);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", update); io?.disconnect(); };
  }, [endId]);

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex items-center gap-2 rounded-2xl bg-slate-900 p-2 pl-4 text-white shadow-[0_12px_40px_-12px_rgba(2,6,23,0.6)]">
        <p className="min-w-0 flex-1 text-[14px] leading-snug">Regn på en bolig på 60 sekunder</p>
        <Link
          href="/analyseren"
          onClick={() => captureEvent("analyze_started", { from: "blog_sticky", slug })}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-[14px] font-semibold"
        >
          Prøv gratis <ArrowRight aria-hidden size={15} />
        </Link>
        <button
          type="button"
          aria-label="Luk"
          onClick={() => {
            try { sessionStorage.setItem(KEY, "1"); } catch { /* blocked */ }
            setShow(false);
          }}
          className="flex h-11 w-9 shrink-0 items-center justify-center text-white/60"
        >
          <X aria-hidden size={18} />
        </button>
      </div>
    </div>
  );
}
