"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { HeroInput } from "./HeroInput";

/*
 * "Under facaden" — the landing page's opening scene.
 *
 * One illustrative house, drawn as an architect's elevation. Scrolling runs a
 * scan line down the sheet: above the line the facade turns into a blueprint
 * with numbered annotations (price per m², rent, tax, roof upkeep, the sewer
 * line under the lawn). The same numbers then build a monthly ledger on the
 * left, each row carrying the marker it came from, and the sheet gets stamped
 * with the verdict.
 *
 * Everything is driven by one 0→1 `progress` value: on desktop it follows the
 * scroll through a pinned stage; on phones it plays once when the drawing
 * scrolls into view (the lightweight equivalent of a scroll-scrubbed video).
 * Reduced motion jumps straight to the finished drawing.
 *
 * All numbers are an illustrative example, labelled as such on the page.
 */

// ── Example economics (rounded, illustrative) ─────────────────────────────
const EX = {
  price: 1_995_000,
  area: 132,
  rent: 13_000,
  loan: 8_650,
  tax: 1_150,
  upkeep: 1_000,
  insurance: 1_100,
  down: 399_000,
};
const CASH_FLOW = EX.rent - EX.loan - EX.tax - EX.upkeep - EX.insurance; // 1.100
const PER_M2 = Math.round(EX.price / EX.area); // 15.114

const kr = (n: number) => Math.round(n).toLocaleString("da-DK");

// ── Timeline of the scene (fractions of progress) ────────────────────────
const T = {
  heroOut: [0.06, 0.1] as const,
  scan: [0.1, 0.36] as const,
  ledger: 0.4,
  rows: [0.45, 0.5, 0.55, 0.6, 0.65],
  total: 0.69,
  verdict: 0.78,
  stamp: 0.8,
};

// Drawing coordinates (viewBox 640 × 440) of the things the scan passes.
const SHEET_H = 440;

type Row = {
  marker?: string;
  label: string;
  note: string;
  value: number;
};

const ROWS: Row[] = [
  { marker: "2", label: "Husleje", note: "markedsleje, 132 m²", value: EX.rent },
  { label: "Realkreditlån", note: "80 % · 4,0 % fast · inkl. bidrag", value: -EX.loan },
  { marker: "3", label: "Ejendomsskat & grundskyld", note: "efter vurdering 2024", value: -EX.tax },
  { marker: "4", label: "Vedligehold", note: "tag, vinduer, installationer", value: -EX.upkeep },
  { label: "Forsikring & tomgang", note: "5 % tomgang indregnet", value: -EX.insurance },
];

// ─────────────────────────────────────────────────────────────────────────

export function FacadeReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"scroll" | "auto">("auto");

  const progress = useMotionValue(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setMode(mq.matches ? "scroll" : "auto");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (mode === "scroll") progress.set(scrollYProgress.get());
  }, [mode, progress, scrollYProgress]);

  // Dev-only handle for inspecting any frame of the scene without scrolling.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __niScene?: MotionValue<number> }).__niScene = progress;
  }, [progress]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (mode === "scroll") progress.set(v);
  });

  // Phones: play the scene once, when the drawing is actually on screen.
  const sheetInView = useInView(sheetRef, { amount: 0.55, once: true });
  useEffect(() => {
    if (mode !== "auto" || !sheetInView) return;
    if (reduce) {
      progress.set(1);
      return;
    }
    progress.set(T.scan[0]);
    const controls = animate(progress, 1, { duration: 6.5, ease: [0.45, 0, 0.35, 1] });
    return () => controls.stop();
  }, [mode, sheetInView, reduce, progress]);

  const pinned = mode === "scroll";

  return (
    <section
      id="hvordan"
      ref={sectionRef}
      aria-label="Sådan læser NordInvest en ejendom"
      className="drafting-paper relative lg:h-[400vh]"
    >
      <div className="lg:sticky lg:top-16 lg:h-[calc(100svh-4rem)]">
        <div className="mx-auto grid h-full max-w-7xl grid-cols-1 gap-x-14 gap-y-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-y-0 lg:px-8 lg:pb-14 lg:pt-4">
          {/* ── Left: the story, one phase at a time on desktop ── */}
          <Phase progress={progress} pinned={pinned} range={[-1, -0.5, ...T.heroOut]} first>
            <HeroCopy progress={progress} pinned={pinned} />
          </Phase>

          {/* ── Right: the drawing sheet ── */}
          <div
            ref={sheetRef}
            className="lg:col-start-2 lg:row-start-1 lg:flex lg:h-full lg:flex-col lg:justify-center"
          >
            <Sheet progress={progress} />
          </div>

          <Phase progress={progress} pinned={pinned} range={[0.1, 0.14, 0.36, 0.4]}>
            <ScanCopy progress={progress} />
          </Phase>

          <Phase progress={progress} pinned={pinned} range={[0.4, 0.44, 0.74, 0.78]}>
            <LedgerCopy progress={progress} />
          </Phase>

          <Phase progress={progress} pinned={pinned} range={[0.78, 0.82, 2, 3]}>
            <VerdictCopy />
          </Phase>

          {pinned && <ProgressRail progress={progress} />}
        </div>
      </div>
    </section>
  );
}

// ── Phase wrapper ────────────────────────────────────────────────────────
// Desktop: every phase shares grid cell (1,1) and cross-fades on progress.
// Phones: phases simply stack in document order around the sheet.

function Phase({
  progress,
  pinned,
  range,
  first,
  children,
}: {
  progress: MotionValue<number>;
  pinned: boolean;
  range: [number, number, number, number];
  first?: boolean;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, range, [0, 1, 1, 0]);
  const y = useTransform(progress, range, [28, 0, 0, -28]);
  const pointerEvents = useTransform(opacity, (o) => (o > 0.6 ? "auto" : "none"));
  const visibility = useTransform(opacity, (o) => (o < 0.02 ? "hidden" : "visible"));

  return (
    <motion.div
      style={pinned ? { opacity, y, pointerEvents, visibility } : undefined}
      className={`min-w-0 lg:col-start-1 lg:row-start-1 lg:self-center ${first ? "" : "lg:opacity-0"}`}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "emerald" }) {
  return (
    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 backdrop-blur">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${tone === "emerald" ? "bg-emerald-500" : "bg-blue-600"}`}
        style={{ boxShadow: tone === "emerald" ? "0 0 0 3px rgba(16,185,129,.15)" : "0 0 0 3px rgba(37,99,235,.15)" }}
      />
      {children}
    </div>
  );
}

// ── Phase 0 — the hero ───────────────────────────────────────────────────

function HeroCopy({ progress, pinned }: { progress: MotionValue<number>; pinned: boolean }) {
  const hint = useTransform(progress, [0, 0.04], [1, 0]);
  return (
    <div className="flex flex-col items-start">
      <Eyebrow>Dansk ejendomsanalyse</Eyebrow>
      <h1 className="font-thesis text-[2.7rem] font-normal leading-[1.02] tracking-[-0.025em] text-[#0b1b33] [text-wrap:balance] sm:text-6xl lg:text-[4.4rem]">
        Bag hver facade gemmer sig <em className="text-blue-700">et regnestykke.</em>
      </h1>
      <p className="mt-6 max-w-[34rem] text-base leading-relaxed text-slate-600 sm:text-lg">
        Indsæt et link fra en dansk boligside. NordInvest læser tallene bag facaden — cashflow,
        afkast, rentestress og en klar dom — på under 60 sekunder.
      </p>
      <div className="mt-8 w-full max-w-xl">
        <HeroInput />
      </div>
      <p className="mt-4 text-sm text-slate-500">
        3 gratis analyser om måneden <span aria-hidden className="px-1 text-slate-300">·</span> intet
        kreditkort
      </p>
      {pinned && (
        <motion.div
          style={{ opacity: hint }}
          className="mt-12 hidden items-center gap-3 font-drafting text-[11px] uppercase tracking-[0.16em] text-slate-500 lg:flex"
        >
          <span aria-hidden className="scroll-cue relative block h-8 w-px overflow-hidden bg-slate-300" />
          Rul for at se, hvad der gemmer sig bag facaden
        </motion.div>
      )}
    </div>
  );
}

// ── Phase 1 — the scan ───────────────────────────────────────────────────

const SCANNED: { label: string; at: number }[] = [
  { label: "Boligareal og pris pr. m² mod naboerne", at: 0.14 },
  { label: "Markedsleje for størrelse og postnummer", at: 0.22 },
  { label: "Ejendomsskat, grundskyld og drift", at: 0.29 },
  { label: "Lokalplaner og kloakprojekter i jorden", at: 0.34 },
];

function ScanCopy({ progress }: { progress: MotionValue<number> }) {
  return (
    <div>
      <Eyebrow>Under facaden</Eyebrow>
      <h2 className="font-thesis text-[2.1rem] font-normal leading-[1.06] tracking-[-0.02em] text-[#0b1b33] [text-wrap:balance] sm:text-5xl">
        Facaden er det, mægleren viser dig. <em className="text-blue-700">Vi læser resten.</em>
      </h2>
      <p className="mt-5 max-w-[34rem] leading-relaxed text-slate-600 sm:text-lg">
        BBR, sammenlignelige boliger, skat og plandata — det, der ikke står i salgsopstillingen,
        men bestemmer, om huset kan betale sig selv.
      </p>
      <ul className="mt-7 space-y-2.5">
        {SCANNED.map((s) => (
          <ScanItem key={s.label} progress={progress} at={s.at}>
            {s.label}
          </ScanItem>
        ))}
      </ul>
    </div>
  );
}

function ScanItem({ progress, at, children }: { progress: MotionValue<number>; at: number; children: ReactNode }) {
  const done = useTransform(progress, [at - 0.02, at], [0, 1]);
  const color = useTransform(done, [0, 1], ["#94a3b8", "#0b1b33"]);
  return (
    <li className="flex items-center gap-3 text-[15px]">
      <span aria-hidden className="relative grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white ring-1 ring-inset ring-slate-200">
        <motion.svg viewBox="0 0 12 12" className="h-3 w-3 text-blue-600" style={{ opacity: done }}>
          <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </span>
      <motion.span style={{ color }}>{children}</motion.span>
    </li>
  );
}

// ── Phase 2 — the ledger ─────────────────────────────────────────────────

function LedgerCopy({ progress }: { progress: MotionValue<number> }) {
  const totalText = useTransform(progress, [T.total, T.total + 0.05], [0, CASH_FLOW], {
    clamp: true,
  });
  const totalLabel = useTransform(totalText, (v) => `+${kr(v)}`);
  const totalOpacity = useTransform(progress, [T.total - 0.01, T.total + 0.02], [0.25, 1]);

  // Waterfall geometry: every bar is placed on one shared 0 → rent scale.
  let running = 0;
  const bars = ROWS.map((r) => {
    const from = r.value > 0 ? running : running + r.value;
    running += r.value;
    return { from, width: Math.abs(r.value) };
  });

  return (
    <div>
      <Eyebrow>Regnestykket</Eyebrow>
      <h2 className="font-thesis text-[2.1rem] font-normal leading-[1.06] tracking-[-0.02em] text-[#0b1b33] [text-wrap:balance] sm:text-5xl">
        Hver linje peger <em className="text-blue-700">tilbage på huset.</em>
      </h2>
      <p className="mt-4 max-w-[34rem] leading-relaxed text-slate-600">
        Markeringerne på tegningen går igen i regnestykket. Intet tal uden en kilde.
      </p>

      <div className="ledger-card mt-6 [@media(max-height:820px)]:lg:mt-4 overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 font-drafting text-[10.5px] uppercase tracking-[0.14em] text-slate-500 sm:px-5">
          <span>Pr. måned</span>
          <span>Købspris {kr(EX.price)} kr</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {ROWS.map((r, i) => (
            <LedgerRow key={r.label} row={r} bar={bars[i]} progress={progress} at={T.rows[i]} />
          ))}
        </ul>
        <motion.div
          style={{ opacity: totalOpacity }}
          className="flex items-center justify-between gap-4 border-t border-slate-200 bg-emerald-50/60 px-4 py-3.5 sm:px-5"
        >
          <span className="text-sm font-semibold text-slate-900">Cash flow efter alt</span>
          <span className="font-display text-2xl font-semibold tabular-nums tracking-tight text-emerald-700">
            <motion.span>{totalLabel}</motion.span> <span className="text-base font-medium">kr/md.</span>
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
  const opacity = useTransform(progress, [at - 0.03, at], [0.18, 1]);
  const grow = useTransform(progress, [at - 0.02, at + 0.02], [0, 1]);
  const positive = row.value > 0;
  return (
    <motion.li
      style={{ opacity }}
      className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 sm:grid-cols-[1.5rem_minmax(0,1fr)_6.5rem_auto] sm:px-5 [@media(max-height:820px)]:lg:py-2"
    >
      <span aria-hidden className="grid h-5 w-5 place-items-center">
        {row.marker ? (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-blue-600 font-drafting text-[10px] font-semibold text-white">
            {row.marker}
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-900">{row.label}</span>
        <span className="block truncate text-xs text-slate-500 [@media(max-height:820px)]:lg:hidden">{row.note}</span>
      </span>
      {/* Waterfall bar on a shared scale — reads as one running total. */}
      <span aria-hidden className="relative hidden h-2 rounded-full bg-slate-100 sm:block">
        <motion.span
          className={`absolute inset-y-0 rounded-full ${positive ? "bg-blue-600" : "bg-slate-400"}`}
          style={{
            left: `${(bar.from / EX.rent) * 100}%`,
            width: `${(bar.width / EX.rent) * 100}%`,
            scaleX: grow,
            originX: positive ? 0 : 1,
          }}
        />
      </span>
      <span className={`text-right font-display text-[15px] font-semibold tabular-nums ${positive ? "text-slate-900" : "text-slate-600"}`}>
        {positive ? "+" : "−"}
        {kr(Math.abs(row.value))}
      </span>
    </motion.li>
  );
}

// ── Phase 3 — the verdict ────────────────────────────────────────────────

function VerdictCopy() {
  const stats = [
    { label: "Cash flow", value: `+${kr(CASH_FLOW)} kr/md.`, good: true },
    { label: "Bruttoafkast", value: "7,8 %" },
    { label: "Kontantafkast", value: "3,3 %" },
    { label: "Tåler renten op til", value: "ca. 5,2 %" },
  ];
  return (
    <div>
      <Eyebrow tone="emerald">Dommen</Eyebrow>
      <h2 className="font-thesis text-[2.1rem] font-normal leading-[1.06] tracking-[-0.02em] text-[#0b1b33] [text-wrap:balance] sm:text-5xl">
        Solid handel — <em className="text-emerald-700">med luft til en rentestigning.</em>
      </h2>
      <dl className="mt-7 grid max-w-[34rem] grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200/70 ring-1 ring-slate-200">
        {stats.map((s) => (
          <div key={s.label} className="bg-white px-4 py-3.5">
            <dt className="text-xs text-slate-500">{s.label}</dt>
            <dd className={`mt-0.5 font-display text-xl font-semibold tabular-nums tracking-tight ${s.good ? "text-emerald-700" : "text-slate-900"}`}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href="/analyseren"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition hover:bg-blue-700 active:translate-y-px"
        >
          Læs din egen bolig <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
        <Link href="#maanedens-deals" className="text-sm font-semibold text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline">
          Se månedens bedste handler
        </Link>
      </div>
      <p className="mt-5 max-w-[34rem] font-drafting text-[11px] leading-relaxed text-slate-500">
        Illustrativ ejendom. Tallene er afrundede eksempler — ikke en rigtig bolig og ikke
        finansiel rådgivning.
      </p>
    </div>
  );
}

// ── Progress rail (desktop) ──────────────────────────────────────────────

const RAIL: { label: string; from: number; to: number }[] = [
  { label: "Facaden", from: 0, to: T.heroOut[1] },
  { label: "Under facaden", from: T.heroOut[1], to: T.scan[1] },
  { label: "Regnestykket", from: T.ledger, to: T.total + 0.05 },
  { label: "Dommen", from: T.verdict, to: T.stamp + 0.04 },
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
      <motion.div style={{ color }} className="mt-2 font-drafting text-[10.5px] uppercase tracking-[0.12em]">
        {label}
      </motion.div>
    </div>
  );
}

// ── The drawing sheet ────────────────────────────────────────────────────

function Sheet({ progress }: { progress: MotionValue<number> }) {
  const scanY = useTransform(progress, [...T.scan], [0, SHEET_H], { clamp: true });
  const scanOpacity = useTransform(progress, [T.scan[0], T.scan[0] + 0.01, T.scan[1] - 0.01, T.scan[1]], [0, 1, 1, 0]);
  const scanGlowY = useTransform(scanY, (y) => y - 46);
  const scanLabelY = useTransform(scanY, (y) => y - 9);
  const status = useTransform<number, string>(progress, (v) =>
    v < T.scan[0] ? "Facade" : v < T.scan[1] ? "Scanner …" : v < T.verdict ? "Regner …" : "Dom: solid",
  );

  return (
    <figure className="m-0">
      <div className="sheet-frame relative overflow-hidden rounded-[22px] bg-[#f6f8fb]">
        <svg
          viewBox={`0 0 640 ${SHEET_H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Illustrativ tegning af en villa på ${EX.area} m². Facaden scannes til en blueprint med markeringer for pris pr. m², husleje, skat og vedligehold.`}
        >
          <defs>
            <clipPath id="ni-xray">
              <motion.rect x="0" y="0" width="640" style={{ height: scanY }} />
            </clipPath>
            <pattern id="ni-brick" width="16" height="7" patternUnits="userSpaceOnUse">
              <path d="M0 6.5H16M8 0V6.5" stroke="#e1e6ee" strokeWidth="1" />
            </pattern>
            <pattern id="ni-tile" width="12" height="9" patternUnits="userSpaceOnUse">
              <path d="M0 8.5H12" stroke="#344058" strokeWidth="1" />
            </pattern>
            <pattern id="ni-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0H0V20" fill="none" stroke="rgba(141,184,255,0.11)" strokeWidth="1" />
            </pattern>
            <pattern id="ni-soil" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <path d="M0 0V8" stroke="rgba(141,184,255,0.18)" strokeWidth="1" />
            </pattern>
            <linearGradient id="ni-scan-glow" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#60a5fa" stopOpacity="0" />
              <stop offset="1" stopColor="#60a5fa" stopOpacity="0.32" />
            </linearGradient>
          </defs>

          <FacadeLayer />

          <g clipPath="url(#ni-xray)">
            <BlueprintLayer progress={progress} scanY={scanY} />
          </g>

          {/* Scan line */}
          <motion.g style={{ opacity: scanOpacity }}>
            <motion.rect x="0" width="640" height="46" fill="url(#ni-scan-glow)" style={{ y: scanGlowY }} />
            <motion.line x1="0" x2="640" y1="0" y2="0" stroke="#93c5fd" strokeWidth="1.6" style={{ y: scanY }} />
            <motion.g style={{ y: scanLabelY }}>
              <rect x="512" y="0" width="112" height="18" rx="9" fill="#0b2350" stroke="#60a5fa" strokeWidth="1" />
              <text x="568" y="12.5" textAnchor="middle" fontSize="9" fill="#dbeafe" letterSpacing="1.4" style={{ fontFamily: "var(--font-drafting)" }}>
                SCANNER
              </text>
            </motion.g>
          </motion.g>

          <Stamp progress={progress} />
        </svg>

        {/* Title block — like the corner of an architect's drawing. */}
        <div className="grid grid-cols-[1.2fr_1fr_1fr] whitespace-nowrap border-t border-slate-200 font-drafting text-[9.5px] uppercase tracking-[0.04em] text-slate-500 sm:grid-cols-[1.25fr_1fr_0.6fr_1fr] sm:text-[10.5px] sm:tracking-[0.08em] [&>div]:min-w-0 [&>div]:truncate">
          <div className="border-r border-slate-200 px-3 py-2.5 sm:px-4">
            <span className="block text-slate-400">Tegning</span>
            <span className="text-slate-800">Facade mod vej</span>
          </div>
          <div className="border-r border-slate-200 px-3 py-2.5 sm:px-4">
            <span className="block text-slate-400">Ejendom</span>
            <span className="text-slate-800">Villa · {EX.area} m²</span>
          </div>
          <div className="hidden border-r border-slate-200 px-4 py-2.5 sm:block">
            <span className="block text-slate-400">Mål</span>
            <span className="text-slate-800">1:100</span>
          </div>
          <div className="px-3 py-2.5 sm:px-4">
            <span className="block text-slate-400">Status</span>
            <motion.span className="text-blue-700">{status}</motion.span>
          </div>
        </div>
      </div>
      <figcaption className="mt-2.5 text-right font-drafting text-[10.5px] text-slate-500">
        Illustrativ ejendom og afrundede tal
      </figcaption>
    </figure>
  );
}

// House geometry, shared by both layers so the blueprint registers exactly
// on top of the facade.
const G = {
  ground: 372,
  body: { x: 132, y: 232, w: 376, h: 140 },
  plinth: { x: 128, y: 352, w: 384, h: 20 },
  roof: "108,236 532,236 470,118 170,118",
  dormer: { x: 282, y: 150, w: 76, h: 62 },
  dormerRoof: "272,156 368,156 320,124",
  dormerWin: { x: 301, y: 166, w: 38, h: 36 },
  chimney: { x: 410, y: 90, w: 26, h: 44 },
  windows: [156, 224, 360, 428].map((x) => ({ x, y: 262, w: 56, h: 66 })),
  door: { x: 302, y: 282, w: 36, h: 70 },
};

function FacadeLayer() {
  const { body, plinth, dormer, dormerWin, chimney, door } = G;
  return (
    <g>
      {/* sheet border */}
      <rect x="10" y="10" width="620" height="420" rx="10" fill="none" stroke="#dbe2ec" />
      {/* ground */}
      <rect x="10" y={G.ground} width="620" height={SHEET_H - G.ground - 10} fill="#e9eef4" />
      <line x1="40" x2="600" y1={G.ground} y2={G.ground} stroke="#a3afbf" strokeWidth="1.5" />
      {/* hedge */}
      <path d="M40 372c0-14 8-22 18-22 3-10 14-14 22-8 8-8 22-6 26 4 10-2 18 8 16 26Z" fill="#c9d6c4" />
      <path d="M548 372c0-12 7-19 16-19 3-9 13-12 20-7 7-7 19-5 23 4 9-2 15 7 14 22Z" fill="#c9d6c4" />

      <rect {...rect(chimney)} fill="#5f6a7d" />
      <rect x={chimney.x - 3} y={chimney.y - 4} width={chimney.w + 6} height="6" fill="#4b5567" />

      <rect {...rect(body)} fill="#f3f5f8" />
      <rect {...rect(body)} fill="url(#ni-brick)" />
      <polygon points={G.roof} fill="#26314a" />
      <polygon points={G.roof} fill="url(#ni-tile)" />

      <rect {...rect(dormer)} fill="#f3f5f8" />
      <polygon points={G.dormerRoof} fill="#26314a" />
      <Window w={dormerWin} />

      <rect {...rect(plinth)} fill="#c7cfda" />
      {G.windows.map((w, i) => (
        <Window key={i} w={w} />
      ))}
      {/* door + canopy */}
      <rect {...rect(door)} fill="#1d3f78" />
      <rect x={door.x + 6} y={door.y + 8} width={door.w - 12} height="22" fill="#2a5298" />
      <circle cx={door.x + door.w - 8} cy={door.y + 40} r="1.8" fill="#dbeafe" />
      <rect x={door.x - 10} y={door.y - 8} width={door.w + 20} height="5" fill="#26314a" />
      {/* house number */}
      <text x={door.x + door.w + 8} y={door.y + 6} fontSize="9" fill="#475569" style={{ fontFamily: "var(--font-drafting)" }}>
        14
      </text>
    </g>
  );
}

function Window({ w }: { w: { x: number; y: number; w: number; h: number } }) {
  return (
    <g>
      <rect {...rect(w)} fill="#a9c1e2" stroke="#ffffff" strokeWidth="3" />
      <path d={`M${w.x + w.w / 2} ${w.y}V${w.y + w.h}M${w.x} ${w.y + w.h * 0.45}H${w.x + w.w}`} stroke="#ffffff" strokeWidth="2" />
      <path d={`M${w.x + 4} ${w.y + w.h - 5}L${w.x + w.w / 2 - 4} ${w.y + 6}`} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="3" />
    </g>
  );
}

const rect = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x, y: r.y, width: r.w, height: r.h });

const LINE = "#8db8ff";
const INK = "#dbeafe";

function BlueprintLayer({ progress, scanY }: { progress: MotionValue<number>; scanY: MotionValue<number> }) {
  const { body, plinth, dormer, dormerWin, chimney, door } = G;
  const stroke = { fill: "none", stroke: LINE, strokeWidth: 1.3 } as const;
  return (
    <g>
      <rect x="0" y="0" width="640" height={SHEET_H} fill="#0b2350" />
      <rect x="0" y="0" width="640" height={SHEET_H} fill="url(#ni-grid)" />
      <rect x="10" y="10" width="620" height="420" rx="10" fill="none" stroke="rgba(141,184,255,0.35)" />

      {/* below ground — the part no listing photo shows */}
      <rect x="10" y={G.ground} width="620" height={SHEET_H - G.ground - 10} fill="url(#ni-soil)" />
      <line x1="40" x2="600" y1={G.ground} y2={G.ground} stroke={LINE} strokeWidth="1.6" />
      <rect x={body.x + 4} y={G.ground} width={body.w - 8} height="34" {...stroke} strokeDasharray="5 4" />
      <path d={`M${door.x + 18} ${G.ground + 34}V${G.ground + 48}H604`} {...stroke} strokeDasharray="2 4" strokeWidth="2" />
      <text x="604" y={G.ground + 42} textAnchor="end" fontSize="8.5" fill={LINE} letterSpacing="1" style={{ fontFamily: "var(--font-drafting)" }}>
        KLOAKSTIK
      </text>

      <rect {...rect(chimney)} {...stroke} />
      <rect {...rect(body)} {...stroke} />
      <polygon points={G.roof} {...stroke} />
      {/* roof build-up lines */}
      <path d="M150 200H490M130 220H510" stroke={LINE} strokeOpacity="0.35" strokeDasharray="3 5" />
      <rect {...rect(dormer)} {...stroke} />
      <polygon points={G.dormerRoof} {...stroke} />
      <rect {...rect(dormerWin)} {...stroke} />
      <rect {...rect(plinth)} {...stroke} />
      {G.windows.map((w, i) => (
        <g key={i}>
          <rect {...rect(w)} {...stroke} />
          <path d={`M${w.x + w.w / 2} ${w.y}V${w.y + w.h}M${w.x} ${w.y + w.h * 0.45}H${w.x + w.w}`} stroke={LINE} strokeOpacity="0.6" />
        </g>
      ))}
      <rect {...rect(door)} {...stroke} />
      <path d={`M${door.x} ${door.y + door.h}A${door.w} ${door.w} 0 0 1 ${door.x + door.w} ${door.y + door.h - door.w}`} stroke={LINE} strokeOpacity="0.5" fill="none" strokeDasharray="2 3" />

      {/* dimension line across the house */}
      <Reveal scanY={scanY} at={60}>
        <path d={`M${body.x} 52V68M${body.x + body.w} 52V68M${body.x} 60H${body.x + body.w}`} stroke={INK} strokeWidth="1" />
        <path d={`M${body.x} 60l7-3v6ZM${body.x + body.w} 60l-7-3v6Z`} fill={INK} />
        <rect x="236" y="49" width="168" height="22" rx="4" fill="#0b2350" />
        <text x="320" y="64" textAnchor="middle" fontSize="11" fill={INK} style={{ fontFamily: "var(--font-drafting)" }}>
          {EX.area} m² · {kr(PER_M2)} kr/m²
        </text>
        <Marker n="1" x={body.x - 16} y={60} progress={progress} />
      </Reveal>

      {/* ④ roof */}
      <Reveal scanY={scanY} at={176}>
        <path d="M232 176L150 150H136" stroke={INK} strokeWidth="1" fill="none" />
        <Marker n="4" x={232} y={176} progress={progress} pulseAt={T.rows[3]} />
        <Label x={16} y={132} title="TAG · 40 ÅR" value={`${kr(EX.upkeep)} kr/md.`} />
      </Reveal>

      {/* ② door → rent */}
      <Reveal scanY={scanY} at={300}>
        <path d={`M${door.x + door.w / 2} 308V250H514`} stroke={INK} strokeWidth="1" fill="none" />
        <Marker n="2" x={door.x + door.w / 2} y={316} progress={progress} pulseAt={T.rows[0]} />
        <Label x={514} y={232} w={112} title="MARKEDSLEJE" value={`${kr(EX.rent)} kr/md.`} />
      </Reveal>

      {/* ③ plot → tax */}
      <Reveal scanY={scanY} at={398}>
        <path d="M188 392L150 410H136" stroke={INK} strokeWidth="1" fill="none" />
        <Marker n="3" x={188} y={392} progress={progress} pulseAt={T.rows[2]} />
        <Label x={16} y={394} title="SKAT & GRUNDSKYLD" value={`${kr(EX.tax)} kr/md.`} />
      </Reveal>
    </g>
  );
}

function Reveal({ scanY, at, children }: { scanY: MotionValue<number>; at: number; children: ReactNode }) {
  const opacity = useTransform(scanY, [at - 6, at + 22], [0, 1]);
  return <motion.g style={{ opacity }}>{children}</motion.g>;
}

function Label({ x, y, w = 118, title, value }: { x: number; y: number; w?: number; title: string; value: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="36" rx="6" fill="#0e2c63" stroke="rgba(141,184,255,0.55)" />
      <text x={x + 8} y={y + 14} fontSize="8" letterSpacing="0.8" fill={LINE} style={{ fontFamily: "var(--font-drafting)" }}>
        {title}
      </text>
      <text x={x + 8} y={y + 28} fontSize="12" fontWeight="600" fill="#ffffff" style={{ fontFamily: "var(--font-drafting)" }}>
        {value}
      </text>
    </g>
  );
}

function Marker({
  n,
  x,
  y,
  progress,
  pulseAt,
}: {
  n: string;
  x: number;
  y: number;
  progress: MotionValue<number>;
  pulseAt?: number;
}) {
  const at = pulseAt ?? -1;
  // When the ledger row for this marker appears, the marker answers with a
  // short pulse — the visual link between drawing and numbers.
  const scale = useTransform(progress, [at - 0.03, at, at + 0.04], [1, 1.45, 1]);
  const ring = useTransform(progress, [at - 0.03, at, at + 0.05], [0, 0.9, 0]);
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.circle r="15" fill="none" stroke="#60a5fa" strokeWidth="2" style={{ opacity: ring }} />
      <motion.g style={{ scale }}>
        <circle r="9.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.8" />
        <text y="3.4" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ffffff" style={{ fontFamily: "var(--font-drafting)" }}>
          {n}
        </text>
      </motion.g>
    </g>
  );
}

function Stamp({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [T.stamp, T.stamp + 0.015], [0, 1]);
  const scale = useTransform(progress, [T.stamp, T.stamp + 0.03], [1.7, 1]);
  const rotate = useTransform(progress, [T.stamp, T.stamp + 0.03], [-26, -11]);
  const c = { x: 546, y: 126, r: 60 };
  return (
    <g transform={`translate(${c.x} ${c.y})`}>
      <motion.g style={{ opacity, scale, rotate }}>
        <path id="ni-stamp-path" d="M-49 0a49 49 0 1 1 98 0a49 49 0 1 1 -98 0" fill="none" />
        <circle r={c.r} fill="rgba(6,78,59,0.55)" stroke="#34d399" strokeWidth="2.4" />
        <circle r={c.r - 18} fill="none" stroke="#34d399" strokeOpacity="0.6" strokeWidth="1" />
        <text fontSize="8" fill="#6ee7b7" style={{ fontFamily: "var(--font-drafting)" }}>
          <textPath href="#ni-stamp-path" startOffset="0" textLength="300" lengthAdjust="spacing">
            NORDINVEST · ANALYSERET · ILLUSTRATIV ·
          </textPath>
        </text>
        <text y="4" textAnchor="middle" fontSize="28" fontWeight="600" fill="#ecfdf5" style={{ fontFamily: "var(--font-display)" }}>
          68
        </text>
        <text y="19" textAnchor="middle" fontSize="7.2" letterSpacing="1.1" fill="#a7f3d0" style={{ fontFamily: "var(--font-drafting)" }}>
          SOLID HANDEL
        </text>
      </motion.g>
    </g>
  );
}
