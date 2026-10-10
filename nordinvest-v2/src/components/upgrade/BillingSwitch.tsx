"use client";

import { clsx } from "@/lib/clsx";
import { krFmt, maxYearlySaving, type Period } from "@/lib/pricing";

/**
 * Monthly / yearly switch. Yearly is the default everywhere; the switch is
 * "on" for yearly, with the saving next to it so the choice explains itself.
 */
export function BillingSwitch({ period, onChange, dark }: { period: Period; onChange: (p: Period) => void; dark?: boolean }) {
  // Two big buttons rather than a toggle switch: easier to hit on a phone and
  // impossible to misread.
  const opt = (p: Period, label: string) => {
    const on = period === p;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => onChange(p)}
        className={clsx(
          "min-h-[44px] flex-1 rounded-lg px-4 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          on ? (dark ? "bg-white text-slate-900" : "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.12)]") : dark ? "text-white/70" : "text-slate-500",
        )}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div role="radiogroup" aria-label="Betaling" className={clsx("flex w-full max-w-[320px] gap-1 rounded-xl p-1", dark ? "bg-white/10" : "bg-slate-100")}>
        {opt("month", "Månedlig")}
        {opt("year", "Årlig")}
      </div>
      {maxYearlySaving > 0 && (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[13px] font-semibold text-emerald-800">
          Årlig: 2 måneder gratis, spar op til {krFmt(maxYearlySaving)} kr.
        </span>
      )}
    </div>
  );
}
