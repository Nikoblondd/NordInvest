"use client";

import { clsx } from "@/lib/clsx";
import { krFmt, maxYearlySaving, type Period } from "@/lib/pricing";

/**
 * Monthly / yearly switch. Yearly is the default everywhere; the switch is
 * "on" for yearly, with the saving next to it so the choice explains itself.
 */
export function BillingSwitch({ period, onChange, dark }: { period: Period; onChange: (p: Period) => void; dark?: boolean }) {
  const on = period === "year";
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-semibold">
      <button type="button" onClick={() => onChange("month")} className={clsx(on ? (dark ? "text-white/50" : "text-slate-400") : dark ? "text-white" : "text-slate-900")}>
        Månedlig
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Vis årspriser"
        onClick={() => onChange(on ? "month" : "year")}
        className={clsx(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          on ? "bg-blue-600" : dark ? "bg-white/25" : "bg-slate-300",
        )}
      >
        <span className={clsx("absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
      </button>
      <button type="button" onClick={() => onChange("year")} className={clsx(on ? (dark ? "text-white" : "text-slate-900") : dark ? "text-white/50" : "text-slate-400")}>
        Årlig
      </button>
      {maxYearlySaving > 0 && (
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[12px] font-semibold text-emerald-800">
          2 måneder gratis · spar op til {krFmt(maxYearlySaving)} kr.
        </span>
      )}
    </div>
  );
}
