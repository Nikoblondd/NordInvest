"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { clsx } from "@/lib/clsx";

/*
 * The app's small UI kit, so every page is built from the same parts: buttons,
 * a dialog that is a centred card on desktop and a bottom sheet on phones,
 * a segmented switch, cards and empty states.
 */

export const btn = {
  primary: "inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 active:translate-y-px disabled:opacity-50",
  secondary: "inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[14px] font-semibold text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 active:translate-y-px disabled:opacity-50",
  ghost: "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50",
  danger: "inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg px-3.5 text-[14px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50",
  dark: "inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-slate-800 active:translate-y-px disabled:opacity-50",
};

export const input = "h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100";
export const label = "text-[13px] font-medium text-slate-700";

export function Dialog({ open, onClose, title, sub, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; sub?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && box.current) {
        const f = Array.from(box.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")).filter((el) => !el.hasAttribute("disabled"));
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener("keydown", k);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => box.current?.querySelector<HTMLElement>("[autofocus], input, select, textarea, button")?.focus(), 30);
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[800] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={title}
        className={clsx("flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_30px_80px_-20px_rgba(2,6,23,0.45)] sm:rounded-2xl", wide ? "sm:max-w-[720px]" : "sm:max-w-[520px]")}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>
            {sub && <p className="mt-0.5 text-[14px] text-slate-500">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Luk" className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, size = "md", label: aria }: { value: T; onChange: (v: T) => void; options: { id: T; label: React.ReactNode }[]; size?: "sm" | "md"; label: string }) {
  return (
    <div role="radiogroup" aria-label={aria} className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}
          className={clsx("flex items-center gap-1.5 rounded-md px-3 font-semibold transition-colors", size === "sm" ? "h-8 text-[13px]" : "h-9 text-[14px]", value === o.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card({ title, action, children, className, pad = true, id }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean; id?: string }) {
  return (
    <section id={id} className={clsx("rounded-2xl border border-slate-200 bg-white", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function Empty({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">{icon}</span>}
      <p className="mt-3 text-[15px] font-semibold text-slate-800">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[14px] leading-relaxed text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, label: aria, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={aria} disabled={disabled} onClick={() => onChange(!on)}
      className={clsx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50", on ? "bg-blue-600" : "bg-slate-300")}>
      <span className={clsx("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

export function Toast({ text, onClose, tone = "ok", action }: { text: string; onClose: () => void; tone?: "ok" | "bad"; action?: React.ReactNode }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, [onClose, text]);
  return (
    <div role="status" className="fixed inset-x-0 bottom-[76px] z-[850] flex justify-center px-4 lg:bottom-6">
      <div className={clsx("flex max-w-[520px] items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium text-white shadow-xl", tone === "bad" ? "bg-rose-700" : "bg-slate-900")}>
        <span className="min-w-0 flex-1">{text}</span>{action}
        <button type="button" onClick={onClose} aria-label="Luk" className="-mr-1 flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:text-white"><X size={15} /></button>
      </div>
    </div>
  );
}
