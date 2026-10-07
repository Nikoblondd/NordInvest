"use client";

import { useEffect, useState } from "react";
import { captureEvent } from "@/lib/analytics-events";
import { ArrowRight, Check, Coffee, Loader2 } from "lucide-react";
import { useCheckout } from "@/lib/use-checkout";
import { everyday, krFmt, tiers, yearly, type Period } from "@/lib/pricing";
import { clsx } from "@/lib/clsx";

const starter = tiers.find((t) => t.id === "starter")!;

const PERKS = ["Hele analysen for denne bolig, låst op nu", "10 analyser om måneden", "Bankrapport og Excel-model", "Opsig med ét klik"];

/**
 * Shown only after the free analyses are used: the visitor has already seen
 * what the product does, so the page says that, keeps the score as the hook and
 * prices Starter in everyday terms (per day, against a coffee). Design drawn
 * with an image model (Higgsfield) and rebuilt here so prices stay live.
 */
export function PaywallGate({
  score,
  rating,
  verdict,
  max,
  scoreColor,
  kind = "rental",
}: {
  score: number;
  rating: string;
  verdict: string;
  max: number;
  scoreColor: string;
  kind?: "rental" | "flip";
}) {
  const [period, setPeriod] = useState<Period>("year");
  const [later, setLater] = useState(false);
  const { href, ready, onClick } = useCheckout("starter", period);
  useEffect(() => captureEvent("paywall_shown", { tier: "starter" }), []);
  const resets = new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long" }).format(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
  );

  const y = yearly(starter);
  const e = everyday(starter, period);
  const billed = period === "year" && y ? `${krFmt(y.total)} kr. om året` : `${krFmt(starter.price)} kr. om måneden`;
  const pct = Math.max(0, Math.min(100, score));

  return (
    <section className="mx-auto max-w-[560px] px-1 sm:px-0" aria-labelledby="paywall-h">
      {/* The hook: the score they already earned, the rest blurred behind it. */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-16px_rgba(15,23,42,0.25)] sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0" role="img" aria-label={`Score ${score} af 100: ${rating}`}>
            <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden>
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e2e8f0" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28" fill="none" strokeWidth="5" strokeLinecap="round"
                className={clsx("stroke-current", scoreColor)}
                strokeDasharray={`${(pct / 100) * 175.9} 175.9`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[19px] font-semibold tabular-nums text-slate-900">{score}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-slate-900">
              {score} / 100 · <span className={scoreColor}>{rating}</span>
            </p>
            <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-slate-500">{verdict}</p>
          </div>
        </div>
        <div aria-hidden className="mt-4 space-y-2 blur-[5px] select-none">
          <div className="flex justify-between text-[14px] text-slate-500"><span>{kind === "flip" ? "Fortjeneste efter skat" : "Cash flow pr. md."}</span><span className="font-semibold text-emerald-600">{kind === "flip" ? "+ 1··.··· kr" : "+ 2.4·· kr"}</span></div>
          <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-600 via-blue-300 to-emerald-500" />
          <div className="flex justify-between text-[14px] text-slate-500"><span>{kind === "flip" ? "Dit maksimale bud" : "Buffer før tab"}</span><span className="font-semibold text-slate-900">{kind === "flip" ? "·.···.··· kr" : "+1,· %-point"}</span></div>
        </div>
      </div>

      <h3 id="paywall-h" className="mt-9 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-slate-900 [text-wrap:balance] sm:text-[36px]">
        Du har set, hvad NordInvest kan.
      </h3>
      <p className="mt-2 text-[16px] leading-relaxed text-slate-500">
        Dine {max} gratis analyser er brugt. Fortsæt med alle tal for denne bolig og de næste.
      </p>

      {/* The price, in everyday terms. */}
      <div className="mt-7">
        <p className="flex items-baseline gap-2">
          <span className="text-[48px] font-semibold leading-none tabular-nums tracking-[-0.04em] text-slate-900">{e.perDayLabel} kr.</span>
          <span className="text-[16px] text-slate-500">om dagen</span>
        </p>
        <div className="mt-4 flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/70">
            <Coffee aria-hidden size={20} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 border-l border-slate-200 pl-3.5">
            <p className="text-[15px] font-semibold text-slate-900">{e.coffee}</p>
            <p className="text-[14px] text-slate-500">{billed} · 10 analyser om måneden</p>
          </div>
        </div>
      </div>

      {y && (
        <div role="radiogroup" aria-label="Betaling" className="mt-7 grid grid-cols-2 rounded-full border border-slate-200 bg-slate-100/70 p-1">
          {(["year", "month"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => setPeriod(p)}
              className={clsx(
                "flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-[15px] font-semibold transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                period === p ? "bg-blue-600 text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.7)]" : "text-slate-700 hover:text-slate-900",
              )}
            >
              {p === "year" ? "Årligt" : "Månedligt"}
              {p === "year" && (
                <span className={clsx("rounded-full px-2 py-0.5 text-[12px] font-semibold", period === "year" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-800")}>
                  2 mdr. gratis
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-7 space-y-3">
        {PERKS.map((p) => (
          <li key={p} className="flex items-center gap-3 text-[15px] text-slate-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check aria-hidden size={14} strokeWidth={3} />
            </span>
            {p}
          </li>
        ))}
      </ul>

      <a
        key={period}
        href={href}
        aria-disabled={!ready}
        onClick={() => onClick("paywall")}
        className={clsx(
          "mt-8 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-[16px] font-semibold text-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.8)] transition-[background-color,transform] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]",
          !ready && "pointer-events-none opacity-70",
        )}
      >
        {ready ? <>Fortsæt med Starter <ArrowRight aria-hidden size={17} /></> : <Loader2 aria-hidden size={17} className="animate-spin" />}
      </a>
      <p className="mt-3 text-center text-[13px] text-slate-500">
        Sikker betaling via Stripe ·{" "}
        <button type="button" onClick={() => setLater(true)} className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900">
          Ikke nu
        </button>{" "}
        · <a href="/priser?fra=graense" className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900">Alle planer</a>
      </p>
      {later && (
        <p role="status" className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-center text-[14px] text-slate-600">
          Helt fint. Dine {max} gratis analyser kommer igen den {resets}.
        </p>
      )}
    </section>
  );
}
