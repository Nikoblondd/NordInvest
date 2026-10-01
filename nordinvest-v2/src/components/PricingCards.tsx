"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { annualReady, offeredTiers } from "@/lib/pricing";
import { clsx } from "@/lib/clsx";
import { BuyButton } from "@/components/BuyButton";

// Five-tier pricing grid with real product-designer craft: cards have layered
// depth, the recommended tier gets a genuinely different treatment (dark card
// with a subtle grid pattern and a proper accent ribbon), and check-marks are
// small custom marks — not the default lucide `CheckCircle2` icon that ships
// on every SaaS landing page.
const kr = (n: number) => Math.round(n).toLocaleString("da-DK");

export function PricingCards() {
  const [period, setPeriod] = useState<"month" | "year">("month");
  const yearly = annualReady && period === "year";
  return (
    <div className="w-full">
      {annualReady && (
        <div className="mb-8 flex justify-center">
          <div role="radiogroup" aria-label="Betaling" className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-sm font-semibold">
            {(["month", "year"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={period === p}
                onClick={() => setPeriod(p)}
                className={clsx("rounded-full px-4 py-2 transition-colors", period === p ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900")}
              >
                {p === "month" ? "Månedlig" : "Årlig · 2 måneder gratis"}
              </button>
            ))}
          </div>
        </div>
      )}
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
      {offeredTiers.map((t) => {
        const featured = t.featured;
        const perMonth = yearly && t.annualPrice ? t.annualPrice / 12 : t.price;
        return (
          <div
            key={t.id}
            className={clsx(
              "relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-300 lg:p-7",
              featured
                ? "border-slate-800 bg-slate-900 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.4)] md:-translate-y-3"
                : "border-slate-200/80 bg-white shadow-card hover:-translate-y-[1px] hover:shadow-card-lift",
            )}
            style={
              !featured
                ? { boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)" }
                : undefined
            }
          >
            {featured && (
              <>
                {/* Faint grid texture — a real design detail like Linear/Vercel
                    use on premium surfaces. Kills the flat AI dark-card look. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.14]"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                    maskImage:
                      "radial-gradient(ellipse at top right, black 20%, transparent 65%)",
                  }}
                />
                {/* soft accent glow, top-right corner */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl"
                />
                {/* recommended ribbon */}
                <div className="relative z-10 mb-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white ring-1 ring-inset ring-white/20 backdrop-blur">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]" />
                  Anbefalet
                </div>
              </>
            )}

            <div className="relative z-10">
              <h3
                className={clsx(
                  "text-sm font-semibold uppercase tracking-[0.08em]",
                  featured ? "text-blue-300" : "text-slate-500",
                )}
              >
                {t.name}
              </h3>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span
                  className={clsx(
                    "text-[2.6rem] font-bold tracking-[-0.03em] tnum leading-none",
                    featured ? "text-white" : "text-slate-900",
                  )}
                >
                  {kr(perMonth)}
                </span>
                <span
                  className={clsx(
                    "text-sm font-medium",
                    featured ? "text-slate-400" : "text-slate-400",
                  )}
                >
                  kr / md.
                </span>
              </div>
              {yearly && t.annualPrice ? (
                <p className={clsx("mt-1.5 text-[13px]", featured ? "text-slate-400" : "text-slate-500")}>
                  {kr(t.annualPrice)} kr. betalt én gang om året
                </p>
              ) : null}
              <p
                className={clsx(
                  "mt-2 text-sm leading-relaxed",
                  featured ? "text-slate-300" : "text-slate-500",
                )}
              >
                {t.blurb}
              </p>
            </div>

            {/* Features — custom mini check-marks, not the ubiquitous
                `CheckCircle2`. Featured tier gets brighter checks. */}
            <ul
              className={clsx(
                "relative z-10 mt-6 flex-1 space-y-3 text-sm",
                featured ? "text-slate-200" : "text-slate-700",
              )}
            >
              {t.features.map((f, i) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className={clsx(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                      featured
                        ? "bg-blue-500/20 text-blue-300 ring-1 ring-inset ring-blue-400/30"
                        : "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100",
                    )}
                  >
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span
                    className={clsx(
                      i === 0 && "font-medium",
                      i === 0 && (featured ? "text-white" : "text-slate-900"),
                    )}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <div className="relative z-10 mt-7">
              {t.stripeLink ? (
                <BuyButton
                  key={period}
                  tierId={t.id}
                  label={t.cta.label}
                  featured={featured}
                  period={yearly ? "year" : "month"}
                />
              ) : (
                <Link
                  href={t.cta.href}
                  className={clsx(
                    "block w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors",
                    featured
                      ? "bg-white text-slate-900 shadow-btn hover:bg-slate-100"
                      : "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  {t.cta.label}
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
