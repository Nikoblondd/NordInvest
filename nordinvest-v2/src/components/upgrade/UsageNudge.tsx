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
const plural = (n: number) => (n === 1 ? "analyse" : "analyser");

/**
 * One line under the analysis that says where the visitor stands: how many
 * analyses are left, and the next step when that runs low. Quiet while there
 * is room, specific when there isn't; never shown to unlimited plans.
 */
export function UsageNudge({ authenticated, used, max, unlimited }: { authenticated: boolean; used: number; max: number; unlimited: boolean }) {
  const left = Math.max(0, max - used);
  const urgent = left <= 1;
  const show = !unlimited && max > 0;

  useEffect(() => {
    if (show && urgent) captureEvent("usage_nudge_shown", { authenticated, left });
  }, [show, urgent, authenticated, left]);
  if (!show) return null;

  let text: string;
  let cta: { href: string; label: string; onClick?: () => void } | null = null;
  if (!authenticated) {
    text = left === 0
      ? "Det var din sidste analyse uden konto. Med en gratis konto får du " + FREE_LIMIT + " om måneden og kan gemme boligen."
      : `Du har ${left} ${plural(left)} tilbage uden konto. En gratis konto giver ${FREE_LIMIT} om måneden.`;
    cta = { href: "/auth/signup", label: "Opret gratis konto", onClick: () => setReturnPath(window.location.pathname + window.location.search) };
  } else if (max <= FREE_LIMIT) {
    text = left === 0
      ? `Det var din sidste gratis analyse i ${month()}. Starter giver 10 om måneden for ${starter.price} kr.`
      : `Analyse ${used} af ${max} gratis i ${month()}.`;
    if (urgent) cta = { href: "/priser?fra=forbrug", label: "Se Starter" };
  } else {
    if (!urgent) return null;
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
