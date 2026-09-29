"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { ExpenseCheckResult } from "@/lib/expense-check";

const krM2 = (n: number) =>
  `${new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(n))} kr/m²/md.`;

const TONE: Record<"undervurderet" | "normal" | "høj", { label: string; bg: string; text: string; ring: string; Icon: typeof AlertTriangle }> = {
  undervurderet: {
    label: "Kan være undervurderet",
    bg: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-200",
    Icon: AlertTriangle,
  },
  normal: {
    label: "Normalt niveau",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    ring: "ring-emerald-200",
    Icon: CheckCircle2,
  },
  høj: {
    label: "Over normalt niveau",
    bg: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-200",
    Icon: TrendingUp,
  },
};

/**
 * Udgifts-tjek — the single most specific insight from the r/investering
 * research (Ok-Psychology-3006): "udgiftssiden er ofte sat for lavt" [in the
 * broker's budget]. Benchmarks the listing's stated faste udgifter against
 * comparable active listings' expenses per m². Only renders when we have all
 * four inputs; degrades silently on a thin sample.
 */
export function ExpenseCheck({
  zip,
  type,
  areaM2,
  statedExpense,
}: {
  zip: string;
  type: string;
  areaM2: number;
  statedExpense: number;
}) {
  const [state, setState] = useState<{
    status: "idle" | "loading" | "ok" | "empty" | "fail";
    data?: Extract<ExpenseCheckResult, { ok: true }>;
  }>({ status: "idle" });

  useEffect(() => {
    if (!zip || !areaM2 || statedExpense == null || statedExpense < 0) return;
    let cancelled = false;
    setState({ status: "loading" });
    const url = `/api/expense-check?zip=${encodeURIComponent(zip)}&type=${encodeURIComponent(
      type,
    )}&area=${Math.round(areaM2)}&expense=${Math.round(statedExpense)}`;
    fetch(url)
      .then((r) => r.json())
      .then((j: ExpenseCheckResult) => {
        if (cancelled) return;
        if (j.ok) setState({ status: "ok", data: j });
        else setState({ status: j.reason === "no_matches" ? "empty" : "fail" });
      })
      .catch(() => !cancelled && setState({ status: "fail" }));
    return () => {
      cancelled = true;
    };
  }, [zip, type, areaM2, statedExpense]);

  if (state.status === "idle" || state.status === "fail" || state.status === "empty") return null;

  if (state.status === "loading") {
    return (
      <div aria-busy="true" className="mt-3 flex min-h-[64px] items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-100">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Tjekker om udgifterne matcher sammenlignelige boliger…
      </div>
    );
  }

  if (!state.data) return null;
  const d = state.data;
  const tone = TONE[d.verdict];
  const arrow = d.deltaPct >= 0 ? "+" : "";

  return (
    <div className={clsx("mt-3 flex items-start gap-3 rounded-xl p-3 ring-1", tone.bg, tone.ring)}>
      <tone.Icon className={clsx("mt-0.5 h-4 w-4 flex-shrink-0", tone.text)} />
      <div className="min-w-0">
        <div className={clsx("text-sm font-semibold", tone.text)}>
          Udgifts-tjek: {tone.label}
        </div>
        <p className={clsx("mt-0.5 text-xs", tone.text)}>
          Denne bolig: {krM2(d.statedExpensePerM2)} — median for {d.sampleSize} sammenlignelige: {krM2(d.medianExpensePerM2)} ({arrow}
          {d.deltaPct.toFixed(0)} %)
        </p>
        {d.verdict === "undervurderet" && (
          <p className="mt-1 text-xs text-amber-700">
            Mæglerens budget for faste udgifter ligger markant under normalt niveau for
            området. Kvalificér tallet før du regner videre — spørg specifikt ind til
            forsikring, ejendomsskat og eventuel grundejerforening.
          </p>
        )}
      </div>
    </div>
  );
}
