"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/*
 * A thin progress line at the top of the window from the moment a link is
 * clicked until the next page is on screen, so a click always answers at once
 * instead of the page jumping in after a pause.
 */
export function NavProgress() {
  const path = usePathname();
  const search = useSearchParams()?.toString();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try { url = new URL(href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (timer.current) clearTimeout(timer.current);
      setState("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    timer.current = setTimeout(() => setState("idle"), 320);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [path, search]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2.5px]">
      <div
        className="h-full origin-left bg-blue-600 shadow-[0_0_8px_rgba(37, 52, 90,0.6)]"
        style={{
          transform: `scaleX(${state === "loading" ? 0.82 : state === "done" ? 1 : 0})`,
          opacity: state === "idle" ? 0 : 1,
          transition: state === "loading" ? "transform 2.4s cubic-bezier(0.1, 0.7, 0.2, 1), opacity 0.15s" : state === "done" ? "transform 0.18s ease-out, opacity 0.25s ease 0.12s" : "opacity 0.2s",
        }}
      />
    </div>
  );
}
