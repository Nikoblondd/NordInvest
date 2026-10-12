"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/*
 * Restrained motion for the public page: content eases in once as it enters
 * the screen, and key figures count up. Nothing loops. Everything is off for
 * visitors who ask for reduced motion.
 */

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useInView<T extends Element>(margin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || !("IntersectionObserver" in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { rootMargin: margin, threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return { ref, inView };
}

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, y = 24, className, style }: { children: ReactNode; delay?: number; y?: number; className?: string; style?: CSSProperties }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} data-in={inView || undefined} className={`reveal ${className ?? ""}`} style={{ ...style, ["--d" as string]: `${delay}ms`, ["--y" as string]: `${y}px` }}>
      {children}
    </div>
  );
}

const ease = (t: number) => 1 - Math.pow(1 - t, 4);

/** A number that counts up from zero when it comes into view. Renders the final value on the server. */
export function CountUp({ value, duration = 1600, className }: { value: number; duration?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>("0px 0px -5% 0px");
  const [shown, setShown] = useState(value);
  const started = useRef(false);
  useEffect(() => {
    if (reduced()) return;
    const el = ref.current;
    // Start from zero only when it is not already on screen, so nothing flickers.
    if (el && el.getBoundingClientRect().top > window.innerHeight) setShown(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!inView || started.current || reduced()) return;
    started.current = true;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setShown(Math.round(value * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return <span ref={ref} className={`tabular-nums ${className ?? ""}`}>{shown.toLocaleString("da-DK")}</span>;
}

/** Tweens to a new value whenever it changes (used for live results). */
export function useTween(target: number, ms = 450) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    if (reduced()) { setV(target); from.current = target; return; }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const cur = start + (target - start) * ease(p);
      setV(cur);
      from.current = cur;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
