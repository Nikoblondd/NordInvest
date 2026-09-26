"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Eye, Lock, Pencil } from "lucide-react";
import { HINT_COST, TURN_SECONDS, accuracy, timePenalty } from "./gameLogic";
import { CityMap } from "./CityMap";

/* ---------- shared types ---------- */

export type PlayHome = {
  id: string;
  price?: number; // unknown until revealed in the daily challenge
  area: number;
  rooms?: number;
  yearBuilt?: number;
  energyLabel?: string;
  monthlyExpenses?: number;
  typeLabel?: string;
  address?: string;
  city: string;
  zipCode: string;
  images: string[];
  listingUrl?: string | null;
};

export type HintKey = "area" | "city" | "rooms" | "year" | "energy" | "expense";

export type PlayerGuess = { raw: string; value: number | null; locked: boolean; seconds?: number };

/* ---------- formatting ---------- */

export const fmt = (n: number) => new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(n);
export const kr = (n: number) => `${fmt(n)} kr.`;

export function playerColor(idx: number): string {
  return ["#2563eb", "#e11d48", "#059669", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#475569"][idx % 8];
}

export const ACC_STYLE: Record<string, string> = {
  spot: "bg-emerald-500 text-white",
  sharp: "bg-emerald-100 text-emerald-800",
  close: "bg-amber-100 text-amber-900",
  off: "bg-orange-100 text-orange-900",
  far: "bg-rose-100 text-rose-800",
};
export const ACC_DOT: Record<string, string> = {
  spot: "bg-emerald-500",
  sharp: "bg-emerald-400",
  close: "bg-amber-400",
  off: "bg-orange-400",
  far: "bg-rose-400",
};

/* ---------- hints: only the facts we actually have for this home ---------- */

const HINT_DEFS: { key: HintKey; label: string; value: (h: PlayHome) => string | null }[] = [
  { key: "city", label: "By", value: (h) => (h.city ? `${h.zipCode} ${h.city}` : null) },
  { key: "area", label: "Boligareal", value: (h) => (h.area ? `${h.area} m²` : null) },
  { key: "rooms", label: "Værelser", value: (h) => (h.rooms ? `${h.rooms} værelser` : null) },
  { key: "year", label: "Byggeår", value: (h) => (h.yearBuilt ? String(h.yearBuilt) : null) },
  { key: "energy", label: "Energimærke", value: (h) => h.energyLabel ?? null },
  { key: "expense", label: "Ejerudgift", value: (h) => (h.monthlyExpenses ? `${fmt(h.monthlyExpenses)} kr./md.` : null) },
];

export function availableHints(h: PlayHome) {
  return HINT_DEFS.map((d) => ({ ...d, v: d.value(h) })).filter((d) => d.v != null);
}

export function HintPanel({
  home,
  revealed,
  onReveal,
  shared,
}: {
  home: PlayHome;
  revealed: Set<HintKey>;
  onReveal: (k: HintKey) => void;
  shared: boolean;
}) {
  const hints = availableHints(home);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Hints</h3>
        <span className="text-xs text-slate-500">
          −{HINT_COST} point {shared ? "for alle" : "pr. stk."}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {hints.map((h) => {
          const open = revealed.has(h.key);
          return (
            <button
              key={h.key}
              type="button"
              disabled={open}
              onClick={() => onReveal(h.key)}
              className={`flex min-h-[52px] flex-col items-start justify-center rounded-xl px-3 py-2 text-left ring-1 ring-inset transition ${
                open
                  ? "bg-blue-50 ring-blue-200"
                  : "bg-white ring-slate-200 hover:-translate-y-px hover:ring-blue-300 active:translate-y-0"
              }`}
            >
              <span className="text-xs font-medium text-slate-500">{h.label}</span>
              {open ? (
                <span className="text-sm font-semibold text-slate-900">{h.v}</span>
              ) : (
                <span className="flex items-center gap-1 text-sm font-medium text-blue-700">
                  <Eye className="h-3.5 w-3.5" strokeWidth={2} /> Vis
                </span>
              )}
            </button>
          );
        })}
      </div>
      {revealed.has("city") && home.zipCode && (
        <div className="map-in mt-3">
          <CityMap zip={home.zipCode} city={home.city} />
        </div>
      )}
    </div>
  );
}

/* ---------- gallery with swipe + preloading ---------- */

export function Gallery({ home, nextHome }: { home: PlayHome; nextHome?: PlayHome }) {
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const startX = useRef<number | null>(null);
  const n = home.images.length;

  useEffect(() => setIdx(0), [home.id]);
  useEffect(() => setLoaded(false), [home.id, idx]);

  // Warm the cache: the rest of this home, and the first photo of the next.
  useEffect(() => {
    const urls = [...home.images.slice(1, 6), ...(nextHome?.images.slice(0, 2) ?? [])];
    for (const u of urls) {
      const img = new Image();
      img.src = u;
    }
  }, [home, nextHome]);

  const go = (d: number) => setIdx((i) => (i + d + n) % n);

  return (
    <div>
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-200 shadow-card sm:aspect-[16/10]"
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current == null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        {!loaded && <div className="absolute inset-0 animate-pulse bg-slate-200" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={home.images[idx]}
          src={home.images[idx]}
          alt={`Billede ${idx + 1} af ${n}`}
          onLoad={() => setLoaded(true)}
          draggable={false}
          className={`h-full w-full select-none object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Forrige billede"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow-card transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Næste billede"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-900 shadow-card transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/75 px-2.5 py-1 text-xs font-medium tabular-nums text-white">
              {idx + 1} / {n}
            </span>
          </>
        )}
        {home.typeLabel && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
            {home.typeLabel}
          </span>
        )}
      </div>
      {n > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {home.images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Vis billede ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                i === idx ? "ring-blue-600" : "opacity-70 ring-transparent hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- a player's guess ---------- */

/**
 * Typing is live-formatted (4.300.000) with the caret kept in place; Enter
 * locks. A locked guess is hidden behind dots so the others can't copy it.
 */
export function GuessRow({
  name,
  index,
  guess,
  disabled,
  onGuess,
  onLock,
  onUnlock,
  canUnlock = true,
  autoFocus,
  timer,
}: {
  name: string;
  index: number;
  guess: PlayerGuess | undefined;
  disabled?: boolean;
  onGuess: (raw: string) => string;
  onLock: () => void;
  onUnlock: () => void;
  canUnlock?: boolean;
  autoFocus?: boolean;
  timer?: ReactNode;
}) {
  const [peek, setPeek] = useState(false);
  const locked = !!guess?.locked;
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (caretRef.current != null && el && document.activeElement === el) el.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  });
  useEffect(() => {
    if (autoFocus && !locked && !disabled) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus, locked, disabled]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const prev = guess?.raw ?? "";
    let digits = el.value.replace(/\D/g, "");
    let before = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, "").length;
    // Backspace over a thousands dot deletes the digit in front of it.
    if (digits === prev.replace(/\D/g, "") && el.value.length < prev.length && before > 0) {
      digits = digits.slice(0, before - 1) + digits.slice(before);
      before -= 1;
    }
    const formatted = onGuess(digits);
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < before) {
      if (/\d/.test(formatted[pos])) seen++;
      pos++;
    }
    caretRef.current = pos;
  }

  return (
    <div
      className={`rounded-2xl p-3 ring-1 ring-inset transition ${
        locked ? "bg-emerald-50/60 ring-emerald-200" : disabled ? "bg-slate-50 ring-slate-200 opacity-70" : "bg-white ring-blue-200 shadow-card"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full text-xs font-bold text-white" style={{ background: playerColor(index) }}>
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{name}</span>
        {timer}
        {locked && <Lock className="h-4 w-4 text-emerald-600" strokeWidth={2} />}
      </div>
      {locked ? (
        <div className="flex gap-2">
          <button
            type="button"
            className="flex h-12 flex-1 items-center justify-center rounded-xl bg-white text-sm ring-1 ring-inset ring-slate-200 select-none"
            aria-label={`${name}s gæt er skjult. Hold for at se det.`}
            onPointerDown={() => setPeek(true)}
            onPointerUp={() => setPeek(false)}
            onPointerLeave={() => setPeek(false)}
            onPointerCancel={() => setPeek(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {peek ? (
              <span className="font-semibold tabular-nums text-slate-900">{guess?.raw} kr.</span>
            ) : (
              <span className="text-slate-500">
                <span className="mr-2 tracking-[0.3em] text-slate-400">••••••</span>Hold for at se
              </span>
            )}
          </button>
          {canUnlock && (
            <button
              type="button"
              onClick={() => {
                setPeek(false);
                onUnlock();
              }}
              className="grid h-12 w-12 place-items-center rounded-xl bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-slate-900"
              aria-label="Ret gæt"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              disabled={disabled}
              placeholder="Dit gæt, fx 3.450.000"
              value={guess?.raw ?? ""}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && guess?.value != null) onLock();
              }}
              className="h-12 w-full rounded-xl bg-slate-50 pl-3 pr-10 text-lg font-semibold tabular-nums text-slate-900 outline-none ring-1 ring-inset ring-slate-200 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">kr.</span>
          </div>
          <button
            type="button"
            disabled={disabled || guess?.value == null}
            onClick={onLock}
            className="h-12 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-btn transition hover:bg-blue-700 active:translate-y-px disabled:bg-slate-300"
          >
            Lås
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- turn timer ---------- */

export function useTicker(active: boolean, ms = 200) {
  const [, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setT((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
}

export function TimerBadge({ startedAt }: { startedAt: number }) {
  useTicker(true);
  const used = (Date.now() - startedAt) / 1000;
  const left = TURN_SECONDS - used;
  const pen = timePenalty(used);
  const frac = Math.max(0, Math.min(1, left / TURN_SECONDS));
  const over = left < 0;
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <span className="flex items-center gap-2">
      {over && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white tabular-nums">−{pen || 0} p</span>}
      <span className={`relative grid h-10 w-10 place-items-center ${!over && left < 10 ? "animate-pulse" : ""}`}>
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke={over ? "#e11d48" : left < 10 ? "#f59e0b" : "#2563eb"}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={over ? 0 : c * (1 - frac)}
          />
        </svg>
        <span className={`text-xs font-bold tabular-nums ${over ? "text-rose-600" : "text-slate-900"}`}>
          {over ? `+${Math.floor(-left)}` : Math.ceil(left)}
        </span>
      </span>
    </span>
  );
}

/* ---------- price count-up ---------- */

export function CountUp({ to, ms = 1100, onDone }: { to: number; ms?: number; onDone?: () => void }) {
  const [v, setV] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setV(to);
      done.current?.();
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - k, 4);
      setV(Math.round((to * eased) / 1000) * 1000);
      if (k < 1) raf = requestAnimationFrame(step);
      else {
        setV(to);
        done.current?.();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{fmt(v)}</>;
}

/* ---------- confetti ---------- */

export function Confetti({ burst }: { burst: number }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; d: number; r: number; c: string; delay: number }[]>([]);
  useEffect(() => {
    if (!burst) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#2563eb", "#10b981", "#f59e0b", "#e11d48", "#7c3aed", "#0ea5e9"];
    setPieces(
      Array.from({ length: 70 }, (_, i) => ({
        id: burst * 100 + i,
        x: Math.random() * 100,
        d: 60 + Math.random() * 40,
        r: Math.random() * 720 - 360,
        c: colors[i % colors.length],
        delay: Math.random() * 0.25,
      })),
    );
    const t = window.setTimeout(() => setPieces([]), 2600);
    return () => window.clearTimeout(t);
  }, [burst]);
  if (!pieces.length) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              left: `${p.x}%`,
              background: p.c,
              animationDelay: `${p.delay}s`,
              "--fall": `${p.d}vh`,
              "--spin": `${p.r}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ---------- toasts ---------- */

export type Toast = { id: number; title: string; body?: string; tone?: "badge" | "level" | "info" };

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 shadow-card-lift ring-1 ${
            t.tone === "level" ? "bg-[#0b1b33] text-white ring-white/10" : "bg-white text-slate-900 ring-slate-200"
          }`}
        >
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg ${
              t.tone === "level" ? "bg-amber-400 text-slate-900" : "bg-amber-100 text-amber-700"
            }`}
            aria-hidden
          >
            {t.tone === "level" ? "▲" : "★"}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">{t.title}</span>
            {t.body && <span className={`block text-xs ${t.tone === "level" ? "text-blue-100" : "text-slate-500"}`}>{t.body}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- accuracy pill ---------- */

export function AccuracyPill({ pct }: { pct: number }) {
  const a = accuracy(pct);
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${ACC_STYLE[a.key]}`}>{a.label}</span>;
}
