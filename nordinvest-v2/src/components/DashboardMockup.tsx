import { analyze, kr, krMd, pct } from "@/lib/analysis";

// A realistic sample analysis rendered as a styled panel (not a screenshot).
const sample = analyze({
  price: 4_300_000,
  monthlyRent: 21_500,
  downPaymentPct: 20,
  interestRate: 5.0,
  monthlyExpenses: 3_800,
});

export function DashboardMockup() {
  const scoreColor =
    sample.score >= 65 ? "text-data-pos" : sample.score >= 45 ? "text-data-warn" : "text-data-neg";

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-800/80 p-6 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <div className="micro text-gold-400">Investment Score</div>
          <div className={`font-mono text-6xl font-light tnum ${scoreColor}`}>
            {sample.score}
            <span className="text-2xl text-cream-100/40">/100</span>
          </div>
        </div>
        <span className="rounded-full bg-gold-500/15 px-3 py-1 text-xs font-medium text-gold-400">
          Cashflow · {sample.rating}
        </span>
      </div>

      <p className="mt-4 font-serif text-lg italic text-cream-100">
        {sample.verdict}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { l: "Bruttoafkast", v: pct(sample.grossYield) },
          { l: "Cash flow", v: krMd(sample.cashFlow) },
          { l: "Kontantafkast", v: pct(sample.roi) },
          { l: "Udbetaling", v: kr(sample.downPayment) },
        ].map((m) => (
          <div
            key={m.l}
            className="rounded-xl border border-white/5 bg-navy-900/60 p-3"
          >
            <div className="text-[11px] uppercase tracking-wide text-cream-100/50">
              {m.l}
            </div>
            <div className="mt-1 font-mono text-sm text-cream-100 tnum">{m.v}</div>
          </div>
        ))}
      </div>

      {/* mini cash-flow bar */}
      <div className="mt-5">
        <div className="mb-2 flex justify-between text-[11px] text-cream-100/50">
          <span>Rentestress-test</span>
          <span>break-even ved {pct(sample.breakEvenRate, 1)}</span>
        </div>
        <div className="flex items-end gap-2">
          {[
            { l: "nu", v: sample.cashFlow },
            { l: "+1%", v: sample.stress[0].cashFlow },
            { l: "+2%", v: sample.stress[1].cashFlow },
          ].map((s) => {
            const h = Math.max(6, Math.min(48, 24 + s.v / 300));
            return (
              <div key={s.l} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t ${s.v >= 0 ? "bg-data-pos/70" : "bg-data-neg/70"}`}
                  style={{ height: `${h}px` }}
                />
                <span className="text-[10px] text-cream-100/50">{s.l}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
