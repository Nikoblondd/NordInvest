"use client";

import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { captureEvent } from "@/lib/analytics-events";
import { setReturnPath } from "@/lib/checkout-intent";
import { FREE_LIMIT } from "@/lib/plan";
import { tiers } from "@/lib/pricing";
import { clsx } from "@/lib/clsx";

const starter = tiers.find((t) => t.id === "starter")!;
const month = () => new Intl.DateTimeFormat("da-DK", { month: "long" }).format(new Date());
const nextMonth = () => new Intl.DateTimeFormat("da-DK", { month: "long" }).format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
const plural = (n: number) => (n === 1 ? "analyse" : "analyser");

/**
 * One line under the analysis that says where the visitor stands. Silent while
 * free analyses are left, so the first ones are about the product, not the
 * price; it speaks once, on the last free one. Never shown to unlimited plans.
 */
export function UsageNudge({ authenticated, used, max, unlimited }: { authenticated: boolean; used: number; max: number; unlimited: boolean }) {
  const left = Math.max(0, max - used);
  const free = !authenticated || max <= FREE_LIMIT;
  const urgent = free ? left === 0 : left <= 1;
  const show = !unlimited && max > 0 && urgent;

  useEffect(() => {
    if (show) captureEvent("usage_nudge_shown", { authenticated, left });
  }, [show, authenticated, left]);
  if (!show) return null;

  let text: string;
  let cta: { href: string; label: string; onClick?: () => void } | null = null;
  if (!authenticated) {
    text = `Det var din sidste analyse uden konto. Med en gratis konto får du ${FREE_LIMIT} om måneden og kan gemme boligen.`;
    cta = { href: "/auth/signup", label: "Opret gratis konto", onClick: () => setReturnPath(window.location.pathname + window.location.search) };
  } else if (free) {
    text = `Det var din sidste gratis analyse i ${month()}. De kommer igen den 1. ${nextMonth()}, eller fortsæt med Starter for ${starter.price} kr. om måneden.`;
    cta = { href: "/priser?fra=forbrug", label: "Se Starter" };
  } else {
    text = `${left} ${plural(left)} tilbage i ${month()} på din plan.`;
    cta = { href: "/priser?fra=forbrug", label: "Se større planer" };
  }

  return (
    <div
      className={clsx(
        "mt-6 flex flex-col gap-3 rounded-2xl px-4 py-3.5 text-[15px] sm:flex-row sm:items-center sm:justify-between",
        urgent ? "bg-blue-500/15 text-white ring-1 ring-inset ring-blue-400/30" : "text-white/60",
      )}
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex shrink-0 gap-1">
          {Array.from({ length: Math.min(max, 10) }, (_, i) => (
            <span key={i} className={clsx("h-1.5 w-4 rounded-full", i < used ? (urgent ? "bg-blue-300" : "bg-white/50") : "bg-white/15")} />
          ))}
        </span>
        <span>{text}</span>
      </div>
      {cta && (
        <a
          href={cta.href}
          onClick={() => {
            cta?.onClick?.();
            captureEvent("usage_nudge_clicked", { authenticated, left });
          }}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-white px-4 py-2 text-[14px] font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6aa8ff] sm:self-auto"
        >
          {cta.label} <ArrowRight aria-hidden size={15} />
        </a>
      )}
    </div>
  );
}
