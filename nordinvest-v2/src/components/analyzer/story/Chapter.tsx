"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, SlidersHorizontal, XCircle } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { type Tone, toneDotLight, toneNum } from "./tone";

export type ChapterAnswer = { tone: Tone; text: string };

const toneIcon = { good: CheckCircle2, warn: AlertTriangle, bad: XCircle, neutral: Info } as const;
const toneWord: Record<Tone, string> = { good: "Godt", warn: "Obs", bad: "Problem", neutral: "Info" };

/**
 * One chapter of the analysis. Each chapter is a full-width band (white or the
 * pale "parchment" tint, alternating) so the colour change is the divider: no
 * icon badges, no eyebrows. The heading is the question an investor asks and
 * the line under it is the answer, in the answer's colour. The evidence follows.
 */
export function Chapter({
  id,
  question,
  answer,
  tint = "white",
  flat,
  children,
}: {
  id: string;
  question: string;
  answer: ChapterAnswer;
  tint?: "white" | "tint";
  /** Inside the app: shown as an open tab, not a closed band. */
  flat?: boolean;
  children: ReactNode;
}) {
  const Icon = toneIcon[answer.tone];
  // The sheet above carries the numbers; each chapter is the evidence behind
  // them, closed to its answer until opened by click or by the menu bar (#id).
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => { if (window.location.hash === `#${id}`) setOpen(true); };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [id]);
  if (flat) {
    return (
      <section id={id} aria-labelledby={`${id}-q`} className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:px-6">
          <h2 id={`${id}-q`} className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[22px]">{question}</h2>
          <p className={clsx("mt-1 flex items-start gap-2 text-[15px] font-medium leading-snug", toneNum[answer.tone])}>
            <Icon aria-hidden size={17} strokeWidth={2} className="mt-[2px] shrink-0" />
            <span><span className="sr-only">{toneWord[answer.tone]}: </span>{answer.text}</span>
          </p>
        </div>
        {children}
      </section>
    );
  }
  return (
    <section
      id={id}
      aria-labelledby={`${id}-q`}
      className={clsx("scroll-mt-32 border-t border-slate-200/70 px-4 sm:px-6", tint === "tint" ? "bg-[#ffffff]" : "bg-white")}
    >
      <div className="mx-auto max-w-[1080px]">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="group flex w-full items-center gap-4 py-6 text-left sm:py-7">
          <span className="min-w-0 flex-1">
            <span id={`${id}-q`} role="heading" aria-level={2} className="block text-[22px] font-semibold leading-[1.15] tracking-[-0.02em] text-slate-900 [text-wrap:balance] sm:text-[28px]">
              {question}
            </span>
            <span className={clsx("mt-1.5 flex items-start gap-2 text-[16px] font-medium leading-snug sm:text-[17px]", toneNum[answer.tone])}>
              <Icon aria-hidden size={18} strokeWidth={2} className="mt-[2px] shrink-0" />
              <span>
                <span className="sr-only">{toneWord[answer.tone]}: </span>
                {answer.text}
              </span>
            </span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition group-hover:border-slate-300 group-hover:text-slate-900">
            <ChevronDown aria-hidden size={18} className={clsx("transition-transform", open && "rotate-180")} />
          </span>
        </button>
        {open && <div className="space-y-5 pb-12 sm:pb-16">{children}</div>}
      </div>
    </section>
  );
}

/** A white evidence surface: hairline edge, no shadow. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8", className)}>
      {children}
    </div>
  );
}

/** Progressive disclosure: the deep numbers stay one click away, never deleted. */
export function Details({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 sm:px-8"
      >
        <span>{open ? "Skjul" : "Se"} {label}</span>
        <ChevronDown aria-hidden size={18} strokeWidth={1.8} className={clsx("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-slate-100 p-5 sm:p-8">{children}</div>}
    </div>
  );
}

export type NavItem = { id: string; label: string; tone: Tone };

/**
 * The frosted sub-nav under the site header: which property this is, one link
 * per chapter (its dot is that chapter's answer, so the deal reads from the bar
 * alone), and the one action that matters while reading: adjust the numbers.
 */
export function ChapterNav({
  items,
  title,
  onAdjust,
  action,
}: {
  items: NavItem[];
  title: string;
  onAdjust: () => void;
  /** An extra button on the right, e.g. "Gem i pipeline" inside the app. */
  action?: ReactNode;
}) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-130px 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    // The last chapter is short and never reaches the top band; a sentinel at
    // the page end marks it active once the reader gets there.
    const end = document.getElementById("analyse-end");
    const endObs = end
      ? new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) setActive(items[items.length - 1]?.id);
          },
          { threshold: 0 },
        )
      : null;
    if (end && endObs) endObs.observe(end);
    return () => {
      obs.disconnect();
      endObs?.disconnect();
    };
    // Re-observe only when the set of chapters changes, not on every tone change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join("|")]);

  return (
    <div className="sticky top-16 z-30 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-3">
        <div className={clsx("hidden min-w-0 max-w-[260px] shrink truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-900", action ? "2xl:block" : "lg:block")} translate="no">
          {title}
        </div>
        <nav aria-label="Kapitler i analysen" className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] lg:flex lg:justify-center">
          <ul className="flex gap-0.5 whitespace-nowrap">
            {items.map((it) => (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  aria-current={active === it.id ? "location" : undefined}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                    active === it.id ? "bg-slate-900/[0.06] font-semibold text-slate-900" : "font-medium text-slate-500 hover:text-slate-900",
                  )}
                >
                  <span aria-hidden className={clsx("h-1.5 w-1.5 rounded-full", toneDotLight[it.tone])} />
                  {it.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          onClick={onAdjust}
          className={clsx(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.96]",
            action ? "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50" : "bg-blue-600 text-white hover:bg-blue-700",
          )}
        >
          <SlidersHorizontal aria-hidden size={14} strokeWidth={2} />
          <span className="hidden sm:inline">Justér tallene</span>
          <span className="sm:hidden">Justér</span>
        </button>
        {action}
      </div>
    </div>
  );
}
