"use client";

import { ShieldCheck, TrendingDown } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { num } from "@/lib/analysis";
import { type UncertaintyResult, type Band, certaintyFromBand, CERTAINTY_LABEL } from "@/lib/uncertainty";

const dk = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("da-DK") : "–");

// One metric row: label, the P50 headline, and a visual P10–P90 band.
function BandRow({
  label, band, fmt, tone,
}: {
  label: string;
  band: Band;
  fmt: (n: number) => string;
  tone?: (n: number) => string;
}) {
  const lo = band.p10;
  const hi = band.p90;
  const mid = band.p50;
  // Normalise the fill position across a padded [lo,hi] track.
  const span = hi - lo || 1;
  const pad = span * 0.12;
  const min = lo - pad;
  const max = hi + pad;
  const pos = (v: number) => clampPct(((v - min) / (max - min)) * 100);
  const cert = certaintyFromBand(band);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-medium text-slate-400">{label}</div>
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            cert === "high" && "bg-emerald-50 text-emerald-700",
            cert === "medium" && "bg-blue-50 text-blue-700",
            cert === "low" && "bg-amber-50 text-amber-700",
          )}
        >
          {CERTAINTY_LABEL[cert]}
        </span>
      </div>
      <div className={clsx("mt-1 text-2xl font-bold tnum", tone ? tone(mid) : "text-slate-900")}>{fmt(mid)}</div>
      <div className="mt-3">
        <div className="relative h-2 rounded-full bg-slate-100">
          <div
            className="absolute inset-y-0 rounded-full bg-blue-200"
            style={{ left: `${pos(lo)}%`, right: `${100 - pos(hi)}%` }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-full bg-blue-600"
            style={{ left: `calc(${pos(mid)}% - 2px)` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs font-medium text-slate-400 tnum">
          <span>{fmt(lo)}</span>
          <span className="text-slate-300">forventet</span>
          <span>{fmt(hi)}</span>
        </div>
      </div>
    </div>
  );
}

function clampPct(n: number) {
  return Math.min(100, Math.max(0, n));
}

export function ConfidenceBands({ u }: { u: UncertaintyResult }) {
  const pctPos = Math.round(u.pCashFlowPositive * 100);
  const pctSolid = Math.round(u.pScoreSolid * 100);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck size={16} className="text-blue-600" />
            Konfidens-analyse
          </div>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Vi kører {u.runs.toLocaleString("da-DK")} scenarier, hvor leje, rente, værdistigning, tomgang og udgifter
            varierer inden for realistiske spænd. Båndet viser interval fra konservativt (P10) til optimistisk (P90) —
            stregen er det forventede (median). Smallere bånd = højere sikkerhed.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BandRow
          label="Cash flow / md."
          band={u.cashFlow}
          fmt={(n) => `${dk(n)} kr`}
          tone={(n) => (n >= 0 ? "text-emerald-600" : "text-rose-500")}
        />
        <BandRow label="Nettoafkast" band={u.capRate} fmt={(n) => `${num(n)} %`} />
        <BandRow label="Kontantafkast" band={u.cashOnCash} fmt={(n) => `${num(n)} %`} />
        <BandRow label="IRR" band={u.irr} fmt={(n) => `${num(n)} %`} />
      </div>

      {/* Downside statement — the single line a lender cares about most. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div
          className={clsx(
            "flex items-start gap-3 rounded-2xl border p-4",
            pctPos >= 75 ? "border-emerald-200 bg-emerald-50" : pctPos >= 50 ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50",
          )}
        >
          <TrendingDown
            size={18}
            className={clsx("mt-0.5 shrink-0", pctPos >= 75 ? "text-emerald-600" : pctPos >= 50 ? "text-blue-600" : "text-amber-600")}
          />
          <div className="text-sm">
            <div className="font-semibold text-slate-900">{pctPos} % sandsynlighed for positivt cash flow</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Konservativt (P10): <b className="tnum">{dk(u.cashFlow.p10)} kr/md.</b> — dét bør handlen kunne bære, selv når det går imod dig.
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-slate-500" />
          <div className="text-sm">
            <div className="font-semibold text-slate-900">{pctSolid} % af scenarier er “solide” (score ≥ 65)</div>
            <div className="mt-0.5 text-xs text-slate-600">
              Samlet gevinst spænder fra <b className="tnum">{dk(u.totalProfit.p10)}</b> til <b className="tnum">{dk(u.totalProfit.p90)} kr</b> over perioden.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
