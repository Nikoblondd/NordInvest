"use client";

import { useEffect } from "react";
import { captureEvent } from "@/lib/analytics-events";
import { Lock, Check, Loader2, ArrowRight } from "lucide-react";
import { useCheckout } from "@/lib/use-checkout";
import { tiers } from "@/lib/pricing";
import { clsx } from "@/lib/clsx";

const starter = tiers.find((t) => t.id === "starter")!;

const PERKS = [
  "10 analyser om måneden",
  "Hele analysen for denne bolig, låst op nu",
  "Bankrapport til dit bankmøde",
  "Redigerbar Excel-model",
  "Uden binding, opsig med ét klik",
];

/**
 * Shown when a signed-in free user runs an analysis past their monthly free
 * quota. The score + verdict stay visible as the hook; everything else is the
 * paid unlock. This is the willingness-to-pay moment the validation test needs,
 * placed at maximum demonstrated value.
 */
export function PaywallGate({
  score,
  rating,
  verdict,
  max,
  scoreColor,
}: {
  score: number;
  rating: string;
  verdict: string;
  max: number;
  scoreColor: string;
}) {
  const { href, ready, onClick } = useCheckout("starter");
  useEffect(() => captureEvent("paywall_shown", { tier: "starter" }), []);
  const resets = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long" }).format(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* teaser — the hook */}
      <div className="border-b border-slate-100 p-6 md:p-8">
        <div className="text-[13px] font-medium text-slate-500">Investeringsscore</div>
        <div className="mt-1 flex items-end gap-2.5">
          <span className={clsx("text-7xl font-bold leading-none tnum", scoreColor)}>{score}</span>
          <span className="mb-1.5 text-sm font-medium text-slate-400">af 100 · {rating}</span>
        </div>
        <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">{verdict}</p>
      </div>

      {/* the lock */}
      <div className="relative p-6 md:p-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <Lock size={20} className="text-blue-600" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">Lås den fulde analyse op</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Du har brugt dine {max} gratis analyser denne måned. Med Starter ser du alle tal for denne
            bolig og kan regne videre med det samme. Ellers kommer dine gratis analyser igen den {resets}.
          </p>

          <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Check size={17} className="mt-0.5 shrink-0 text-emerald-500" />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <a
            href={href}
            aria-disabled={!ready}
            onClick={() => onClick("paywall")}
            className={clsx(
              "mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-colors hover:bg-blue-700",
              !ready && "pointer-events-none opacity-70",
            )}
          >
            {ready ? <>Fortsæt med Starter · {starter.price} kr./md. <ArrowRight size={16} /></> : <Loader2 size={16} className="animate-spin" />}
          </a>
          <p className="mt-3 text-xs text-slate-400">
            Sikker betaling via Stripe.{" "}
            <a href="/priser?fra=graense" className="font-medium text-slate-600 underline hover:text-slate-900">Se alle planer</a>
          </p>
        </div>
      </div>
    </section>
  );
}
