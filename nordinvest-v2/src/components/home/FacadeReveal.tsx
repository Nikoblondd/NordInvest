"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight } from "lucide-react";

/*
 * Opening scene of the landing page.
 *
 * A photo of an (AI-generated, illustrative) Danish villa sits on a pinned
 * stage. Scrolling runs a scan line down the photo and swaps it, line by line,
 * for a registered blueprint of the same house. As the line passes the roof,
 * the door and the lawn, numbered callouts appear; the same numbers then turn
 * up in the monthly calculation next to it, and the scene ends on the verdict.
 *
 * One 0→1 `progress` value drives everything and follows the scroll through
 * the pinned section on every screen size. Phones get a stacked layout (photo
 * on top, text below) instead of side by side.
 *
 * The house and all numbers are an example and are labelled as such.
 */

// ── The example (rounded) ────────────────────────────────────────────────
const EX = {
  price: 1_995_000,
  area: 132,
};
type Row = { marker?: string; label: string; note: string; value: number };
const ROWS: Row[] = [
  { marker: "1", label: "Husleje", note: "Markedsleje for 132 m²", value: 13_000 },
  { label: "Realkreditlån", note: "80 % af prisen, 4 % fast rente", value: -8_650 },
  { marker: "2", label: "Grundskyld", note: "Betales til kommunen", value: -900 },
  { marker: "3", label: "Vedligehold", note: "Tag, vinduer og installationer", value: -1_300 },
  { label: "Forsikring", note: "Husforsikring", value: -400 },
  { label: "Tomgang", note: "5 % af lejen", value: -650 },
];
const RENT = ROWS[0].value;
const CASH_FLOW = ROWS.reduce((s, r) => s + r.value, 0); // 1.100
const PER_M2 = Math.round(EX.price / EX.area); // 15.114

const kr = (n: number) => Math.round(n).toLocaleString("da-DK");
const signed = (n: number) => `${n > 0 ? "+" : "−"}${kr(Math.abs(n))}`;

// ── Timeline (fractions of the pinned scroll) ────────────────────────────
const T = {
  heroOut: [0.05, 0.1] as const,
  scan: [0.11, 0.36] as const,
  rows: [0.44, 0.48, 0.52, 0.56, 0.6, 0.64],
  total: 0.69,
  verdict: 0.78,
};

// Where things sit on the photo, in % of its width/height (both images are
// 1618 × 1080 and drawn from the same camera position).
type Callout = {
  n: string;
  row: number;
  at: [number, number]; // marker
  box: { left?: number; right?: number; top: number };
  tip: [number, number]; // where the leader line meets the box
  label: string;
};
const CALLOUTS: Callout[] = [
  { n: "3", row: 3, at: [37, 32], box: { left: 2, top: 15 }, tip: [29.5, 20], label: "Vedligehold" },
  { n: "1", row: 0, at: [50, 58], box: { right: 2, top: 22 }, tip: [70.5, 27], label: "Husleje" },
  { n: "2", row: 2, at: [20, 89], box: { left: 25, top: 84 }, tip: [25, 89], label: "Grundskyld" },
];

// ─────────────────────────────────────────────────────────────────────────

export function FacadeReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const [wide, setWide] = useState<boolean | null>(null);
  const progress = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    progress.set(scrollYProgress.get());
    return () => mq.removeEventListener("change", sync);
  }, [progress, scrollYProgress]);

  useMotionValueEvent(scrollYProgress, "change", (v) => progress.set(v));

  // Dev-only handle for inspecting any frame without scrolling.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __niScene?: MotionValue<number> }).__niScene = progress;
  }, [progress]);

  const ready = wide !== null;

  return (
    <section
      id="hvordan"
      ref={sectionRef}
      aria-label="Sådan regner NordInvest en bolig igennem"
      className="drafting-paper relative h-[460vh] lg:h-[420vh]"
    >
      <div className="sticky top-16 h-[calc(100svh-4rem)] overflow-hidden">
        <div className="mx-auto grid h-full max-w-7xl grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-y-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:grid-rows-1 lg:items-center lg:gap-x-14 lg:px-8 lg:pb-16 lg:pt-4">
          <Phase progress={progress} ready={ready} range={[-1, -0.5, ...T.heroOut]} first className="row-start-2 self-start lg:row-start-1 lg:self-center">
            <IntroCopy progress={progress} />
          </Phase>

          <div className="col-start-1 row-start-1 min-w-0 self-start lg:col-start-2 lg:self-center">
            <Sheet progress={progress} />
          </div>

          <Phase progress={progress} ready={ready} range={[0.1, 0.14, 0.36, 0.385]} className="row-start-2 self-start lg:row-start-1 lg:self-center">
            <ScanCopy progress={progress} />
          </Phase>

          <Phase progress={progress} ready={ready} range={[0.39, 0.43, 0.745, 0.77]} className="row-start-2 self-start lg:row-start-1 lg:self-center">
            <LedgerCopy progress={progress} />
          </Phase>

          <Phase progress={progress} ready={ready} range={[0.775, 0.81, 2, 3]} className="row-start-2 self-start lg:row-start-1 lg:self-center">
            <VerdictCopy />
          </Phase>

          <ProgressRail progress={progress} />
        </div>
      </div>
    </section>
  );
}

// ── Phase wrapper: every phase shares one grid cell and cross-fades ──────

function Phase({
  progress,
  ready,
  range,
  first,
  className = "",
  children,
}: {
  progress: MotionValue<number>;
  ready: boolean;
  range: [number, number, number, number];
  first?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const y = useTransform(progress, range, [24, 0, 0, -24]);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.6 ? "auto" : "none"));
  const visibility = useTransform(opacity, (o) => (o < 0.02 ? "hidden" : "visible"));
  return (
    <motion.div
      style={ready ? { opacity, y, pointerEvents, visibility } : undefined}
      className={`col-start-1 min-w-0 ${first ? "" : "opacity-0"} ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-sm font-medium text-blue-700 lg:mb-4">{children}</p>;
}

const H2 =
  "font-thesis text-[2.1rem] font-normal leading-[1.02] tracking-[-0.01em] text-[#0b1b33] [text-wrap:balance] sm:text-[3.1rem]";

// ── Intro ────────────────────────────────────────────────────────────────

function IntroCopy({ progress }: { progress: MotionValue<number> }) {
  const hint = useTransform(progress, [0, 0.04], [1, 0]);
  return (
    <div>
      <Label>Et eksempel</Label>
      <h2 className={H2}>
        Tag en almindelig villa <span className="text-slate-400">til 1.995.000 kr.</span>
      </h2>
      <p className="mt-4 max-w-[33rem] leading-relaxed text-slate-600 max-lg:text-[15px] lg:mt-5 lg:text-lg">
        Scroll videre, så viser vi, hvordan NordInvest regner den igennem, fra facade til
        resultat.
      </p>
      <motion.div style={{ opacity: hint }} className="mt-8 flex items-center gap-3 text-sm text-slate-500">
        <span aria-hidden className="scroll-cue relative block h-7 w-px overflow-hidden bg-slate-300" />
        Scroll ned
      </motion.div>
    </div>
  );
}

// ── 1. The data ──────────────────────────────────────────────────────────

const CHECKS: { label: string; at: number }[] = [
  { label: "Pris pr. m² mod området", at: 0.16 },
  { label: "Hvad boligen kan lejes ud for", at: 0.23 },
  { label: "Grundskyld og faste udgifter", at: 0.3 },
  { label: "Lokalplaner og kloakprojekter", at: 0.35 },
];

function ScanCopy({ progress }: { progress: MotionValue<number> }) {
  return (
    <div>
      <Label>Data</Label>
      <h2 className={H2}>
        Mægleren viser dig facaden. <span className="text-slate-400">Vi tjekker resten.</span>
      </h2>
      <p className="mt-4 max-w-[33rem] leading-relaxed text-slate-600 max-lg:text-[15px] lg:mt-5 lg:text-lg">
        Vi slår boligen op i BBR, sammenligner prisen med andre boliger i området og tjekker
        grundskyld, lokalplaner og kloak.
      </p>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:mt-7 lg:grid-cols-1 lg:gap-2.5">
        {CHECKS.map((c) => (
          <Check key={c.label} progress={progress} at={c.at}>
            {c.label}
          </Check>
        ))}
      </ul>
    </div>
  );
}

function Check({ progress, at, children }: { progress: MotionValue<number>; at: number; children: ReactNode }) {
  const done = useTransform(progress, [at - 0.02, at], [0, 1]);
  const color = useTransform(done, [0, 1], ["#94a3b8", "#0b1b33"]);
  return (
    <li className="flex items-center gap-3 text-[15px]">
      <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white ring-1 ring-inset ring-slate-200">
        <motion.svg viewBox="0 0 12 12" className="h-3 w-3 text-blue-600" style={{ opacity: done }}>
          <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </span>
      <motion.span style={{ color }}>{children}</motion.span>
    </li>
  );
}

// ── 2. The calculation ───────────────────────────────────────────────────

function LedgerCopy({ progress }: { progress: MotionValue<number> }) {
  const total = useTransform(progress, [T.total, T.total + 0.05], [0, CASH_FLOW], { clamp: true });
  const totalLabel = useTransform(total, (v) => `+${kr(v)}`);
  const totalOpacity = useTransform(progress, [T.total - 0.01, T.total + 0.02], [0.3, 1]);

  // Waterfall: every bar sits on one shared 0 → rent scale.
  let running = 0;
  const bars = ROWS.map((r) => {
    const from = r.value > 0 ? running : running + r.value;
    running += r.value;
    return { from, width: Math.abs(r.value) };
  });

  return (
    <div>
      <Label>Regnestykket</Label>
      <h2 className={H2}>Så regner vi den igennem.</h2>
      <p className="mt-3 max-w-[33rem] leading-relaxed text-slate-600 max-lg:hidden lg:mt-4">
        Leje ind, lån og udgifter ud. Posterne med et nummer kan du finde på billedet.
      </p>

      <div className="ledger-card mt-4 overflow-hidden rounded-2xl bg-white lg:mt-6">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-xs text-slate-500 sm:px-5 [@media(max-height:700px)]:hidden">
          <span>Pr. måned</span>
          <span className="tabular-nums">Købspris {kr(EX.price)} kr., 20 % udbetaling</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {ROWS.map((r, i) => (
            <LedgerRow key={r.label} row={r} bar={bars[i]} progress={progress} at={T.rows[i]} />
          ))}
        </ul>
        <motion.div
          style={{ opacity: totalOpacity }}
          className="flex items-center justify-between gap-4 border-t border-slate-200 bg-emerald-50/70 px-4 py-3 sm:px-5"
        >
          <span className="text-sm font-medium text-slate-900">Tilbage hver måned</span>
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-emerald-700">
            <motion.span>{totalLabel}</motion.span> <span className="text-base font-medium">kr.</span>
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function LedgerRow({
  row,
  bar,
  progress,
  at,
}: {
  row: Row;
  bar: { from: number; width: number };
  progress: MotionValue<number>;
  at: number;
}) {
  const opacity = useTransform(progress, [at - 0.03, at], [0.2, 1]);
  const grow = useTransform(progress, [at - 0.02, at + 0.02], [0, 1]);
  const positive = row.value > 0;
  return (
    <motion.li
      style={{ opacity }}
      className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2 sm:grid-cols-[1.25rem_minmax(0,1fr)_6rem_auto] sm:px-5 lg:py-2.5 [@media(max-height:820px)]:lg:py-1.5"
    >
      <span aria-hidden className="grid h-5 w-5 place-items-center">
        {row.marker ? (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
            {row.marker}
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-900">{row.label}</span>
        <span className="block truncate text-xs text-slate-500 max-lg:hidden [@media(max-height:820px)]:hidden">{row.note}</span>
      </span>
      <span aria-hidden className="relative hidden h-1.5 rounded-full bg-slate-100 sm:block">
        <motion.span
          className={`absolute inset-y-0 rounded-full ${positive ? "bg-blue-600" : "bg-slate-400"}`}
          style={{
            left: `${(bar.from / RENT) * 100}%`,
            width: `${(bar.width / RENT) * 100}%`,
            scaleX: grow,
            originX: positive ? 0 : 1,
          }}
        />
      </span>
      <span className={`text-right text-[15px] font-semibold tabular-nums ${positive ? "text-slate-900" : "text-slate-600"}`}>
        {signed(row.value)}
      </span>
    </motion.li>
  );
}

// ── 3. The verdict ───────────────────────────────────────────────────────

function VerdictCopy() {
  const stats = [
    { label: "Overskud pr. måned", value: `+${kr(CASH_FLOW)} kr.`, good: true },
    { label: "Bruttoafkast", value: "7,8 %" },
    { label: "Kontantafkast", value: "3,3 %" },
    { label: "Break-even-rente", value: "ca. 5,2 %" },
  ];
  return (
    <div>
      <Label>Resultatet</Label>
      <h2 className={H2}>En solid handel.</h2>
      <p className="mt-3 max-w-[33rem] leading-relaxed text-slate-600 max-lg:text-[15px] lg:mt-4 lg:text-lg">
        Huset betaler sig selv med {kr(CASH_FLOW)} kr. i overskud om måneden og kan tåle, at renten
        stiger til omkring 5,2 %.
      </p>
      <dl className="mt-5 grid max-w-[33rem] grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200/70 ring-1 ring-slate-200 lg:mt-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white px-4 py-3">
            <dt className="text-xs text-slate-500">{s.label}</dt>
            <dd className={`mt-0.5 text-lg font-semibold tabular-nums tracking-tight lg:text-xl ${s.good ? "text-emerald-700" : "text-slate-900"}`}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 lg:mt-7">
        <Link
          href="/analyseren"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition hover:bg-blue-700 active:translate-y-px"
        >
          Prøv med din egen bolig <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
        <Link href="#maanedens-deals" className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline">
          Se månedens bedste handler
        </Link>
      </div>
      <p className="mt-4 max-w-[33rem] text-xs leading-relaxed text-slate-500">
        Eksemplet er opdigtet, og tallene er afrundede. Det er ikke finansiel rådgivning.
      </p>
    </div>
  );
}

// ── Progress rail (desktop) ──────────────────────────────────────────────

const RAIL: { label: string; from: number; to: number }[] = [
  { label: "Boligen", from: 0, to: T.heroOut[1] },
  { label: "Data", from: T.heroOut[1], to: T.scan[1] },
  { label: "Regnestykket", from: 0.41, to: T.total + 0.05 },
  { label: "Resultatet", from: T.verdict, to: T.verdict + 0.05 },
];

function ProgressRail({ progress }: { progress: MotionValue<number> }) {
  return (
    <div aria-hidden className="pointer-events-none absolute bottom-6 left-1/2 hidden w-full max-w-7xl -translate-x-1/2 px-8 lg:block">
      <div className="grid max-w-[30rem] grid-cols-4 gap-3">
        {RAIL.map((r) => (
          <RailStep key={r.label} progress={progress} {...r} />
        ))}
      </div>
    </div>
  );
}

function RailStep({ progress, label, from, to }: { progress: MotionValue<number>; label: string; from: number; to: number }) {
  const fill = useTransform(progress, [from, to], [0, 1]);
  const color = useTransform(fill, [0, 0.01], ["#94a3b8", "#0b1b33"]);
  return (
    <div>
      <div className="h-[3px] overflow-hidden rounded-full bg-slate-200">
        <motion.div className="h-full origin-left rounded-full bg-blue-600" style={{ scaleX: fill }} />
      </div>
      <motion.div style={{ color }} className="mt-2 text-xs font-medium">
        {label}
      </motion.div>
    </div>
  );
}

// ── The photo / blueprint sheet ──────────────────────────────────────────

function Sheet({ progress }: { progress: MotionValue<number> }) {
  const scan = useTransform(progress, [...T.scan], [0, 100], { clamp: true });
  const clip = useTransform(scan, (v) => `inset(0 0 ${100 - v}% 0)`);
  const lineTop = useTransform(scan, (v) => `${v}%`);
  const lineOpacity = useTransform(progress, [T.scan[0], T.scan[0] + 0.01, T.scan[1] - 0.01, T.scan[1]], [0, 1, 1, 0]);
  const status = useTransform<number, string>(progress, (v) =>
    v < T.scan[0] ? "Klar" : v < T.scan[1] ? "Tjekker data" : v < T.verdict ? "Regner" : "Solid handel",
  );
  const dim = useTransform(scan, [4, 12], [0, 1]);

  return (
    <figure className="m-0 mx-auto w-full max-lg:max-w-[min(100%,calc((100svh-4rem)*0.62))]">
      <div className="sheet-frame relative overflow-hidden rounded-[18px] bg-white lg:rounded-[22px]">
        <div className="relative aspect-[1618/1080] w-full">
          <Image
            src="/landing/villa-photo.webp"
            alt="Eksempel: hvidkalket dansk villa med sort tegltag"
            fill
            unoptimized
            className="object-cover"
          />
          <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
            <Image src="/landing/villa-blueprint.webp" alt="" fill unoptimized className="object-cover" />
            {/* dimension line across the house */}
            <motion.div style={{ opacity: dim }} className="absolute inset-x-[7.4%] top-[6.5%] h-3">
              <div className="absolute inset-x-0 top-1/2 h-px bg-blue-100/80" />
              <div className="absolute left-0 top-0 h-full w-px bg-blue-100/80" />
              <div className="absolute right-0 top-0 h-full w-px bg-blue-100/80" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-[#0b2350] px-2 text-[10px] font-medium tabular-nums text-blue-50 sm:text-xs">
                {EX.area} m² · {kr(PER_M2)} kr. pr. m²
              </span>
            </motion.div>
          </motion.div>

          {CALLOUTS.map((c) => (
            <CalloutMark key={c.n} c={c} scan={scan} progress={progress} />
          ))}

          <motion.div style={{ top: lineTop, opacity: lineOpacity }} className="pointer-events-none absolute inset-x-0 h-0">
            <div className="absolute inset-x-0 -top-10 h-10 bg-gradient-to-b from-transparent to-blue-400/25" />
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-blue-300" />
          </motion.div>

          <Verdict progress={progress} />
        </div>

        <div className="grid grid-cols-3 border-t border-slate-200 text-[11px] sm:text-xs [&>div]:min-w-0 [&>div]:truncate">
          <div className="border-r border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5">
            <span className="block text-slate-400">Bolig</span>
            <span className="text-slate-800">Villa, {EX.area} m²</span>
          </div>
          <div className="border-r border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5">
            <span className="block text-slate-400">Pris</span>
            <span className="tabular-nums text-slate-800">{kr(EX.price)} kr.</span>
          </div>
          <div className="px-3 py-2 sm:px-4 sm:py-2.5">
            <span className="block text-slate-400">Status</span>
            <motion.span className="font-medium text-blue-700">{status}</motion.span>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-right text-[11px] text-slate-500 max-lg:hidden">
        Eksempelbolig. Billedet er genereret, og tallene er afrundede.
      </figcaption>
    </figure>
  );
}

function CalloutMark({ c, scan, progress }: { c: Callout; scan: MotionValue<number>; progress: MotionValue<number> }) {
  const opacity = useTransform(scan, [c.at[1] - 4, c.at[1] + 6], [0, 1]);
  const at = T.rows[c.row];
  const scale = useTransform(progress, [at - 0.03, at, at + 0.04], [1, 1.4, 1]);
  const ring = useTransform(progress, [at - 0.03, at, at + 0.05], [0, 0.9, 0]);
  const value = ROWS[c.row].value;
  return (
    <motion.div style={{ opacity }} className="pointer-events-none absolute inset-0">
      <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1={c.at[0]} y1={c.at[1]} x2={c.tip[0]} y2={c.tip[1]} stroke="#dbeafe" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${c.at[0]}%`, top: `${c.at[1]}%` }}>
        <motion.span style={{ opacity: ring }} className="absolute -inset-1.5 rounded-full ring-2 ring-blue-300" />
        <motion.span
          style={{ scale }}
          className="grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[11px] font-semibold text-white ring-2 ring-white sm:h-6 sm:w-6 sm:text-xs"
        >
          {c.n}
        </motion.span>
      </span>
      <span
        className="absolute w-[27%] rounded-md bg-[#0b2350]/95 px-2 py-1 ring-1 ring-blue-200/40 sm:px-2.5 sm:py-1.5"
        style={{
          left: c.box.left != null ? `${c.box.left}%` : undefined,
          right: c.box.right != null ? `${c.box.right}%` : undefined,
          top: `${c.box.top}%`,
        }}
      >
        <span className="block text-[9px] leading-tight text-blue-200 sm:text-[11px]">{c.label}</span>
        <span className={`block whitespace-nowrap text-[10.5px] font-semibold leading-tight tabular-nums sm:text-[13px] ${value > 0 ? "text-emerald-300" : "text-white"}`}>
          {signed(value)} kr/md.
        </span>
      </span>
    </motion.div>
  );
}

function Verdict({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [T.verdict, T.verdict + 0.02], [0, 1]);
  const y = useTransform(progress, [T.verdict, T.verdict + 0.03], [10, 0]);
  const arc = useTransform(progress, [T.verdict, T.verdict + 0.05], [0, 0.68]);
  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute bottom-[3%] right-[2.5%] flex items-center gap-2.5 rounded-xl bg-white/95 py-1.5 pl-1.5 pr-3 shadow-card ring-1 ring-slate-200 sm:gap-3 sm:py-2 sm:pl-2 sm:pr-4"
    >
      <span className="relative grid h-9 w-9 place-items-center sm:h-11 sm:w-11">
        <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
          <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
          <motion.circle cx="22" cy="22" r="18" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" style={{ pathLength: arc }} />
        </svg>
        <span className="text-xs font-semibold tabular-nums text-slate-900 sm:text-sm">68</span>
      </span>
      <span>
        <span className="block text-sm font-semibold leading-tight text-slate-900 sm:text-[15px]">Solid handel</span>
        <span className="block text-[11px] leading-tight text-slate-500 sm:text-xs">Score 68 af 100</span>
      </span>
    </motion.div>
  );
}
