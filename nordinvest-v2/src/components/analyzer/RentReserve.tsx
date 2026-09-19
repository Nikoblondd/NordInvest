"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Scale, ChevronDown, Info, ArrowRight } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { RentReserveResult } from "@/lib/rent-reserve";

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

/**
 * Lejereserve — surfaces the single number Danish investors optimize for
 * beyond DSCR and cashflow: the legally realistic 24-month rent uplift and
 * the technical property-value increase it represents.
 *
 * Gated to non-commercial rental analyses only, and only when both a
 * market rent benchmark and a rentable area are known.
 */
export function RentReserve({ reserve }: { reserve: RentReserveResult }) {
  const [open, setOpen] = useState(false);

  const positive = reserve.verdict === "reserve";
  const negative = reserve.verdict === "over-market";

  const badge = positive
    ? { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", label: "Lejereserve" }
    : negative
    ? { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", label: "Over marked" }
    : { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200", label: "På niveau" };

  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <Scale size={16} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">Lejereserve</h3>
        <span
          className={clsx(
            "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
            badge.bg,
            badge.text,
            badge.ring,
          )}
        >
          {badge.label}
        </span>
      </div>

      <p className={clsx("mt-3 text-[15px] font-medium leading-snug", positive ? "text-emerald-700" : negative ? "text-rose-700" : "text-slate-700")}>
        <Icon size={16} className="mb-0.5 mr-1.5 inline align-middle" />
        {reserve.headline}
      </p>

      {/* Nu / Marked / Realistisk — three-column at-a-glance */}
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Nu</div>
          <div className="mt-1 truncate text-lg font-bold tnum text-slate-900">
            {dk(reserve.currentPerM2Month)}
            <span className="ml-0.5 text-xs font-semibold text-slate-400">kr/m²/md</span>
          </div>
        </div>
        <div className="min-w-0 border-x border-slate-200 px-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Marked</div>
          <div className="mt-1 truncate text-lg font-bold tnum text-slate-900">
            {dk(reserve.marketPerM2Month)}
            <span className="ml-0.5 text-xs font-semibold text-slate-400">kr/m²/md</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Realistisk</div>
          <div
            className={clsx(
              "mt-1 truncate text-lg font-bold tnum",
              positive ? "text-emerald-700" : negative ? "text-rose-700" : "text-slate-900",
            )}
          >
            {positive ? "+" : ""}{dk(reserve.realisticMonthlyUplift)}
            <span className="ml-0.5 text-xs font-semibold text-slate-400">kr/md</span>
          </div>
        </div>
      </div>

      {/* Technical value uplift — the "why this matters" number */}
      {positive && reserve.technicalValueUplift > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Teknisk værdi-uplift
            </div>
            <div className="mt-0.5 text-[11px] leading-snug text-emerald-800">
              Ekstra årlig NOI kapitaliseret ved regionens cap rate.
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xl font-bold tnum text-emerald-700 sm:text-2xl">
              +{dk(reserve.technicalValueUplift)}
              <span className="ml-1 text-sm font-semibold text-emerald-600">kr</span>
            </div>
          </div>
        </div>
      )}

      {/* Uplift path — how the 24 months look */}
      {positive && reserve.path.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Sådan realiseres reserven
          </div>
          <div className="space-y-2">
            {reserve.path.map((p) => (
              <div key={p.step} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <ArrowRight size={14} className="mt-1 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-slate-900">{p.label}</div>
                  <div className="text-[11px] text-slate-500">{p.when}</div>
                </div>
                <div className="shrink-0 text-sm font-bold tnum text-emerald-700">
                  +{dk(p.amountMonthly)}
                  <span className="ml-0.5 text-[11px] font-semibold text-emerald-500">kr/md</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal regime + explain drawer */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left text-[12px] transition-colors hover:border-slate-300"
      >
        <span className="flex min-w-0 items-center gap-2 truncate text-slate-600">
          <Info size={13} className="shrink-0 text-slate-400" />
          <span className="truncate">Juridisk regime: {reserve.regimeLabel}</span>
        </span>
        <ChevronDown
          size={14}
          className={clsx("shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-600">
          {reserve.explain}{" "}
          <span className="block pt-2 text-[11px] text-slate-500">
            Beslutningsstøtte, ikke juridisk rådgivning. Konkrete lejevarslinger
            skal altid udarbejdes med udlejer-advokat eller huslejenævn.
          </span>
        </div>
      )}
    </section>
  );
}
