"use client";

import { ArrowRight, Coffee, Lock } from "lucide-react";
import { everyday, tiers } from "@/lib/pricing";
import { captureEvent } from "@/lib/analytics-events";
import type { DealAccess, LockedSummary } from "@/lib/deal-tiers";

const starter = tiers.find((t) => t.id === "starter")!;
const n = (v: number) => Math.round(v).toLocaleString("da-DK");

/*
 * The rest of a search, behind the lock. It says what is there (how many,
 * how many give plus, the best monthly cash flow) without giving the deals
 * away; the server never sends them. Without an account the first step is a
 * free account (top 10); with one, it is Starter.
 */
export function LockedDeals({
  locked,
  access,
  onUpgrade,
}: {
  locked: NonNullable<LockedSummary>;
  access: DealAccess;
  onUpgrade: () => void;
}) {
  const anon = access === "anon";
  const signup = () => {
    captureEvent("deals_lock_signup", { hidden: locked.count });
    import("@/lib/checkout-intent").then(({ setReturnPath }) => {
      setReturnPath(window.location.pathname + window.location.search);
      window.location.href = "/auth/signup";
    });
  };
  const upgrade = () => {
    captureEvent("deals_lock_upgrade", { hidden: locked.count, access });
    onUpgrade();
  };

  return (
    <div className="relative col-span-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      {/* Ghost cards: the shape of the hidden results, no data in them. */}
      <div aria-hidden className="grid gap-5 p-4 opacity-70 blur-[2px] sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={i > 0 ? "hidden sm:block" : undefined}>
            <div className="aspect-[16/10] rounded-xl bg-slate-200" />
            <div className="mt-4 h-3.5 w-2/3 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-1/3 rounded bg-slate-200" />
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="h-8 rounded-lg bg-emerald-100" />
              <div className="h-8 rounded-lg bg-slate-200" />
              <div className="h-8 rounded-lg bg-slate-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-50/40 via-slate-50/85 to-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-card sm:p-6">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Lock aria-hidden size={18} strokeWidth={1.8} />
          </span>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-slate-900 [text-wrap:balance]">
            {n(locked.count)} handler mere i denne søgning
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            {locked.positive > 0 ? (
              <>
                {n(locked.positive)} af dem giver positivt cashflow. Den bedste giver{" "}
                <span className="font-semibold text-emerald-700 tnum">+{n(locked.bestCashflow)} kr.</span> om måneden.
              </>
            ) : (
              "Se dem alle, og sammenlign selv."
            )}
          </p>

          {anon ? (
            <>
              <button
                type="button"
                onClick={signup}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-blue-700 active:translate-y-px"
              >
                Se top 10 med en gratis konto <ArrowRight aria-hidden size={15} />
              </button>
              <button type="button" onClick={upgrade} className="mt-2.5 text-[13px] font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900">
                Eller se alle {n(locked.count + 3)} med Starter
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={upgrade}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-blue-700 active:translate-y-px"
              >
                Lås hele Deal-motoren op <ArrowRight aria-hidden size={15} />
              </button>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[13px] text-slate-500">
                <Coffee aria-hidden size={14} strokeWidth={1.8} className="text-amber-700" />
                Starter fra {everyday(starter, "year").perDayLabel} kr. om dagen
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
