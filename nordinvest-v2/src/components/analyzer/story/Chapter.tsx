"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { type Tone, toneChip, toneDotLight } from "./tone";

export type ChapterAnswer = { tone: Tone; text: string };

/**
 * One chapter of the analysis story. The heading is the question an investor
 * actually asks ("Tjener den penge?"), the chip next to it is the answer in one
 * line — so the page can be read top to bottom in ten seconds, and every card
 * underneath is the evidence for that answer.
 */
export function Chapter({
  id,
  kicker,
  question,
  answer,
  Icon,
  children,
}: {
  id: string;
  kicker: string;
  question: string;
  answer: ChapterAnswer;
  Icon: LucideIcon;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      className="scroll-mt-36"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
    >
      <header className="mb-4 flex flex-col gap-3 sm:mb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-btn ring-1 ring-inset ring-white/10">
            <Icon size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-500">{kicker}</div>
            <h3 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-slate-900 [text-wrap:balance] sm:text-[30px]">
              {question}
            </h3>
          </div>
        </div>
        <AnswerChip answer={answer} />
      </header>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}

export function AnswerChip({ answer }: { answer: ChapterAnswer }) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-start gap-2 self-start rounded-2xl px-3.5 py-2 text-sm font-semibold leading-snug ring-1 ring-inset lg:self-auto",
        toneChip[answer.tone],
      )}
    >
      <span className={clsx("mt-[7px] h-2 w-2 shrink-0 rounded-full", toneDotLight[answer.tone])} />
      <span className="min-w-0">{answer.text}</span>
    </span>
  );
}

/** A white evidence card with the project's layered depth. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 card-highlight sm:p-6", className)}>
      {children}
    </div>
  );
}

/** Progressive disclosure: the deep numbers stay one click away, never deleted. */
export function Details({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white card-highlight">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-6"
      >
        <span>{open ? "Skjul" : "Se"} {label}</span>
        <ChevronDown size={18} strokeWidth={1.8} className={clsx("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-slate-100 p-4 sm:p-6">{children}</div>}
    </div>
  );
}

export type NavItem = { id: string; label: string; tone: Tone };

/**
 * Sticky chapter navigation — the table of contents for the verdict. Each pill
 * carries its chapter's answer colour, so the whole deal is readable from the
 * nav alone; the current chapter is highlighted as you scroll.
 */
export function ChapterNav({ items }: { items: NavItem[] }) {
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
      { rootMargin: "-140px 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    // The last chapters are short and never reach the top band — at the very
    // bottom of the page, the last chapter is the one being read.
    const onScroll = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 280;
      if (atBottom) setActive(items[items.length - 1]?.id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    // Re-observe only when the set of chapters changes, not on every tone change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join("|")]);

  return (
    <nav
      aria-label="Kapitler i analysen"
      className="sticky top-[72px] z-30 -mx-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/85 p-1.5 card-highlight backdrop-blur-md [scrollbar-width:none]"
    >
      <ul className="flex gap-1 whitespace-nowrap">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              aria-current={active === it.id ? "true" : undefined}
              className={clsx(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                active === it.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <span className={clsx("h-2 w-2 rounded-full", toneDotLight[it.tone])} />
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
