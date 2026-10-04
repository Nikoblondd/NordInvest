"use client";

import { useEffect } from "react";
import { ArrowRight, Check, UserRound } from "lucide-react";
import { captureEvent } from "@/lib/analytics-events";
import { setReturnPath } from "@/lib/checkout-intent";
import { ANON_FREE, FREE_LIMIT } from "@/lib/plan";
import { clsx } from "@/lib/clsx";

const PERKS = [
  `${FREE_LIMIT} fulde analyser om måneden, gratis`,
  "Gem boliger og sammenlign dem senere",
  "Prisvagt: besked, når prisen falder",
];

/**
 * Shown on the fourth analysis without an account. The verdict stays visible
 * (the reason to continue); the rest needs a free account, and signup brings
 * the visitor straight back to this analysis.
 */
export function SignupGate({ score, rating, verdict, scoreColor }: { score: number; rating: string; verdict: string; scoreColor: string }) {
  useEffect(() => captureEvent("signup_gate_shown", { after: ANON_FREE }), []);
  const remember = (to: string) => {
    setReturnPath(window.location.pathname + window.location.search);
    captureEvent("signup_gate_clicked", { to });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-labelledby="signup-gate-h">
      <div className="border-b border-slate-100 p-6 md:p-8">
        <div className="text-[13px] font-medium text-slate-500">Investeringsscore</div>
        <div className="mt-1 flex items-end gap-2.5">
          <span className={clsx("text-7xl font-bold leading-none tnum", scoreColor)}>{score}</span>
          <span className="mb-1.5 text-sm font-medium text-slate-500">af 100 · {rating}</span>
        </div>
        <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">{verdict}</p>
      </div>
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-md text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <UserRound aria-hidden size={20} />
          </span>
          <h3 id="signup-gate-h" className="mt-4 text-xl font-bold text-slate-900 [text-wrap:balance]">
            Se hele analysen med en gratis konto
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Du har brugt dine {ANON_FREE} analyser uden konto. Med en gratis konto ser du cashflow, risici, lån og
            datagrundlag for denne bolig, og du kommer direkte tilbage hertil.
          </p>
          <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Check aria-hidden size={17} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <a
            href="/auth/signup"
            onClick={() => remember("signup")}
            className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Opret gratis konto <ArrowRight aria-hidden size={16} />
          </a>
          <p className="mt-3 text-xs text-slate-500">
            Intet kreditkort. Google og LinkedIn tager 20 sekunder.{" "}
            <a href="/auth/login" onClick={() => remember("login")} className="font-medium text-slate-700 underline hover:text-slate-900">
              Log ind
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
