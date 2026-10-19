"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/*
 * The five evidence panels in "Fem spørgsmål", drawn in code rather than as
 * images: crisp at any screen density, readable on a phone, translated with the
 * rest of the page, and built from the same numbers the copy states. They
 * follow the drafts the image model made for them (same layout, colours and
 * labels). Every panel fills a fixed-size frame (square on phones, 16:9 wider)
 * so switching tabs never moves the page.
 */

const kr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr.`;
const EASE = [0.2, 0.7, 0.2, 1] as const;

function Card({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 sm:p-5">
      <p className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-[#17213a] sm:text-[20px]">{title}</p>
      <div className="relative min-h-0 flex-1">{children}</div>
      {footer}
    </div>
  );
}

/** Grows from the left on mount (skipped with reduced motion). */
function Grow({ className, style, delay = 0 }: { className: string; style?: React.CSSProperties; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={{ ...style, transformOrigin: "left" }}
      initial={reduce ? false : { scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    />
  );
}

/* 1 · Lejereserve ---------------------------------------------------------- */
export function RentReserveVisual({ rent = 13000, breakEven = 11900, min = 11000, max = 13500 }) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <Card title="Lejereserve">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
        <div className="relative h-12 sm:h-14">
          <p className="absolute -top-7 whitespace-nowrap text-sm font-semibold text-blue-700" style={{ right: `${100 - pct(rent)}%` }}>
            Leje {kr(rent)}
          </p>
          <div className="absolute inset-0 overflow-hidden rounded-md bg-slate-100">
            <div className="absolute inset-y-0 left-0 bg-rose-100" style={{ width: `${pct(breakEven)}%` }} />
            <Grow
              className="absolute inset-y-0 bg-emerald-600"
              style={{ left: `${pct(breakEven)}%`, width: `${pct(rent) - pct(breakEven)}%` }}
              delay={0.15}
            />
          </div>
          <p
            className="absolute inset-y-0 flex items-center justify-center whitespace-nowrap text-lg font-semibold tabular-nums text-white sm:text-xl"
            style={{ left: `${pct(breakEven)}%`, width: `${pct(rent) - pct(breakEven)}%` }}
          >
            {kr(rent - breakEven)}
          </p>
          <span className="absolute -bottom-1 -top-1 w-[3px] rounded-full bg-blue-600" style={{ left: `calc(${pct(rent)}% - 1.5px)` }} />
          <span className="absolute inset-y-0 border-l border-dashed border-slate-700" style={{ left: `${pct(breakEven)}%` }} />
        </div>
        <div className="relative mt-2 h-12 text-[13px] tabular-nums text-slate-500">
          <span className="absolute left-0 top-0">{min.toLocaleString("da-DK")}</span>
          <span className="absolute right-0 top-0">{max.toLocaleString("da-DK")}</span>
          <span className="absolute top-0 h-6 border-l border-slate-700" style={{ left: `${pct(breakEven)}%` }} />
          <span
            className="absolute top-6 -translate-x-1/2 whitespace-nowrap font-semibold text-slate-800"
            style={{ left: `${pct(breakEven)}%` }}
          >
            Break-even {kr(breakEven)}
          </span>
        </div>
      </div>
    </Card>
  );
}

/* 2 · Pris pr. m² ---------------------------------------------------------- */
const COMPARABLES = [12900, 13600, 14300, 15114, 15500, 15900, 16050, 16400, 17100, 17800, 18600, 19700];
export function PricePerM2Visual({ price = 15114, median = 16050, min = 12500, max = 20500 }) {
  const reduce = useReducedMotion();
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  return (
    <Card
      title="Pris pr. m²"
      footer={
        <p className="text-[13px] text-slate-500">
          Hver prik er en lignende bolig til salg i samme postnummer.
        </p>
      }
    >
      <div className="absolute inset-x-1 top-1/2 -translate-y-1/2">
        {/* The two values sit close together: this home above the line, the
            median below it, so their labels never collide. */}
        <div className="relative h-11 text-[13px]">
          <div className="absolute bottom-0 -translate-x-[70%] text-center" style={{ left: `${pct(price)}%` }}>
            <p className="whitespace-nowrap font-medium text-blue-700">Denne bolig</p>
            <p className="whitespace-nowrap text-[15px] font-semibold tabular-nums text-blue-700">{kr(price)}</p>
          </div>
        </div>
        <div className="relative mt-2 h-9">
          <span className="absolute left-0 right-0 top-1/2 h-px bg-slate-200" />
          <span className="absolute -bottom-1 top-1/2 border-l border-dashed border-slate-500" style={{ left: `${pct(median)}%` }} />
          <span className="absolute -top-1 bottom-1/2 w-px bg-blue-600" style={{ left: `${pct(price)}%` }} />
          {COMPARABLES.map((v, i) => {
            const me = v === price;
            return (
              <motion.span
                key={v}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${me ? "h-4 w-4 bg-blue-600 ring-4 ring-blue-100" : "h-2.5 w-2.5 bg-slate-300"}`}
                style={{ left: `${pct(v)}%` }}
                initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.05 * i, ease: EASE }}
              />
            );
          })}
        </div>
        <div className="relative h-11 text-[13px]">
          <div className="absolute top-1 -translate-x-[20%]" style={{ left: `${pct(median)}%` }}>
            <p className="whitespace-nowrap font-medium text-slate-600">Median</p>
            <p className="whitespace-nowrap text-[15px] font-semibold tabular-nums text-slate-800">{kr(median)}</p>
          </div>
        </div>
        <div className="mt-1 flex justify-between text-[13px] tabular-nums text-slate-500">
          <span>{min.toLocaleString("da-DK")}</span>
          <span>{max.toLocaleString("da-DK")}</span>
        </div>
      </div>
    </Card>
  );
}

/* 3 · Faste udgifter ------------------------------------------------------- */
export function ExpensesVisual({ listing = 2450, similar = 3050, used = 3250 }) {
  const max = Math.max(listing, similar, used) * 1.12;
  const rows = [
    { label: "Salgsopstilling", v: listing, bar: "bg-amber-400" },
    { label: "Lignende boliger", v: similar, bar: "bg-slate-400" },
    { label: "Vi regner med", v: used, bar: "bg-blue-600" },
  ];
  return (
    <Card
      title="Faste udgifter pr. måned"
      footer={
        <p className="flex items-center gap-2.5 rounded-full bg-amber-100 px-3 py-2 text-[15px] font-medium text-amber-950">
          <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-500 text-sm font-bold text-white">!</span>
          <span>
            <strong className="font-semibold tabular-nums">{kr(similar - listing)}</strong> under normalen
          </span>
        </p>
      }
    >
      <div className="flex h-full flex-col justify-center gap-3.5 py-3">
        {rows.map((r, i) => (
          <div key={r.label}>
            <p className="text-sm font-medium text-slate-700">{r.label}</p>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-3.5 min-w-0 flex-1">
                <Grow className={`h-full rounded ${r.bar}`} style={{ width: `${(r.v / max) * 100}%` }} delay={0.1 * i} />
              </div>
              <span className="w-[5.5rem] shrink-0 text-right text-[15px] font-semibold tabular-nums text-slate-900">{kr(r.v)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* 4 · Rentestress ----------------------------------------------------------- */
export function RateStressVisual({ today = 4, breakEven = 5.2, surplusToday = 1100, from = 3, to = 7 }) {
  const reduce = useReducedMotion();
  // Monthly surplus by interest rate: zero at the break-even rate, a gentle
  // curve (a higher rate costs a little more per point as it rises).
  const surplus = (r: number) => ((surplusToday * (breakEven - r)) / (breakEven - today)) * (1 - 0.06 * (r - today));
  const lo = surplus(to);
  const hi = surplus(from);
  const W = 100;
  const H = 100;
  const x = (r: number) => ((r - from) / (to - from)) * W;
  const y = (v: number) => ((hi - v) / (hi - lo)) * H;
  const pts = Array.from({ length: 41 }, (_, i) => from + ((to - from) * i) / 40).map((r) => `${x(r)},${y(surplus(r))}`);
  const ticks = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const pct = (r: number) => `${(x(r) / W) * 100}%`;
  return (
    <Card
      title="Overskud ved forskellige renter"
      footer={
        <div className="relative mt-1 h-5 text-[13px] tabular-nums text-slate-500">
          {ticks.map((t, i) => (
            <span
              key={t}
              className={`absolute whitespace-nowrap ${i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
              style={{ left: pct(t) }}
            >
              {t} %
            </span>
          ))}
        </div>
      }
    >
      <div className="absolute inset-x-2 bottom-1 top-3">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <rect x="0" y={y(0)} width={W} height={H - y(0)} className="fill-rose-50" />
          <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="stroke-slate-400" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1={x(breakEven)} x2={x(breakEven)} y1="0" y2={H} className="stroke-rose-500" strokeWidth="1.25" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <motion.polyline
            points={pts.join(" ")}
            fill="none"
            className="stroke-[#17213a]"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            // pathLength animation breaks with a non-scaling stroke (the dash
            // is measured in the wrong space), so the curve fades in instead.
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
          />
        </svg>
        <span
          className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 ring-4 ring-white"
          style={{ left: pct(today), top: `${y(surplus(today))}%` }}
        />
        <span
          className="absolute -translate-y-[140%] whitespace-nowrap text-sm font-semibold text-blue-700"
          style={{ left: `calc(${pct(today)} + 10px)`, top: `${y(surplus(today))}%` }}
        >
          I dag {today.toLocaleString("da-DK")} %
        </span>
        <span
          className="absolute top-1 whitespace-nowrap text-sm font-semibold leading-tight text-rose-600"
          style={{ left: `calc(${pct(breakEven)} + 8px)` }}
        >
          Underskud fra
          <br />
          ca. {breakEven.toLocaleString("da-DK")} %
        </span>
      </div>
    </Card>
  );
}

/* 5 · Planer i jorden ------------------------------------------------------ */
export function PlanDataVisual() {
  const reduce = useReducedMotion();
  // A schematic street: 3 rows × 5 plots. The subject plot is (1,2); the sewer
  // catchment covers the middle row; the local plan wraps the lot.
  const plots = Array.from({ length: 15 }, (_, i) => ({ col: i % 5, row: Math.floor(i / 5) }));
  const PX = 22;
  const PY = 26;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-[#eef1f5] ring-1 ring-slate-200/70">
        <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden>
          {plots.map(({ col, row }) => {
            const me = col === 2 && row === 1;
            const x0 = 5 + col * PX;
            const y0 = 6 + row * PY;
            return (
              <g key={`${col}-${row}`}>
                <rect x={x0} y={y0} width={PX - 2} height={PY - 3} rx="1" className={me ? "fill-blue-100 stroke-blue-500" : "fill-white stroke-slate-300"} strokeWidth={me ? 0.8 : 0.4} />
                <rect x={x0 + 5} y={y0 + 6} width="9" height="8" rx="0.6" className={me ? "fill-blue-600" : "fill-slate-300"} />
              </g>
            );
          })}
          <motion.rect
            x="3"
            y={6 + PY - 2}
            width={5 * PX}
            height={PY + 1}
            rx="2"
            className="fill-amber-300/25 stroke-amber-500"
            strokeWidth="0.7"
            strokeDasharray="2.5 1.5"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
          <rect x="1.5" y="3" width={5 * PX + 3} height={3 * PY + 1} rx="3" fill="none" className="stroke-slate-500" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
        </svg>
      </div>
      <ul className="grid gap-1.5 text-[13px] leading-snug text-slate-700 sm:grid-cols-3 sm:gap-3">
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm bg-blue-600" /> Boligen
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm border border-dashed border-amber-500 bg-amber-200" /> Kloakopland, separering planlagt
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm border border-dashed border-slate-500" /> Lokalplan
        </li>
      </ul>
    </div>
  );
}
