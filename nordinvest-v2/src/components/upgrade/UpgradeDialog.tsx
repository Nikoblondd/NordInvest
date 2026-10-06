"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, Check, Coffee, FileSpreadsheet, FileText, Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
import { captureEvent } from "@/lib/analytics-events";
import { everyday, krFmt, tiers, yearly, type Period } from "@/lib/pricing";
import { PeriodChoice } from "@/components/upgrade/PeriodChoice";
import { useCheckout } from "@/lib/use-checkout";
import { clsx } from "@/lib/clsx";

export type UpgradeReason = "report" | "excel" | "deals" | "map" | "filters" | "alerts";

const starter = tiers.find((t) => t.id === "starter")!;

const COPY: Record<UpgradeReason, { icon: typeof FileText; title: string; body: string }> = {
  report: {
    icon: FileText,
    title: "Bankrapporten er med i Starter",
    body: "Tag en færdig rapport med til banken: nøgletal, finansiering, rentestress og datagrundlag samlet, klar til at printe eller sende.",
  },
  excel: {
    icon: FileSpreadsheet,
    title: "Excel-modellen er med i Starter",
    body: "Få hele regnestykket som redigerbart regneark med levende formler, så du selv kan justere leje, rente og drift.",
  },
  deals: {
    icon: Search,
    title: "Se alle handler i Deal-motoren",
    body: "Med Starter ser du hver eneste bolig, der matcher din søgning, ikke kun de første. Det er dér, de gode handler gemmer sig.",
  },
  map: {
    icon: MapIcon,
    title: "Kortet er med i Starter",
    body: "Se alle boliger til salg på kortet med pris, cashflow og score, og find de lommer, hvor lejen kan betale lånet.",
  },
  filters: {
    icon: SlidersHorizontal,
    title: "Avancerede filtre er med i Starter",
    body: "Filtrér på minimum cashflow, afkast, score, energimærke, byggeår og gældsdækning, så du kun ser de handler, der passer til din strategi.",
  },
  alerts: {
    icon: Bell,
    title: "Deal-vagt er med i Starter",
    body: "Få en mail, så snart en ny bolig matcher din søgning. De bedste handler er ofte væk inden for få dage.",
  },
};

const DEAL_REASONS: UpgradeReason[] = ["deals", "map", "filters", "alerts"];
const PERKS_DEALS = ["Hele Deal-motoren: alle handler, kort og filtre", "Deal-vagt: mail om nye handler", "10 analyser om måneden med bankrapport og Excel", "Opsig med ét klik, og behold adgangen perioden ud"];
const PERKS_REPORT = ["10 analyser om måneden", "Bankrapport til dit bankmøde", "Redigerbar Excel-model", "Hele Deal-motoren med kort, filtre og Deal-vagt", "Opsig med ét klik, og behold adgangen perioden ud"];

/**
 * Shown when someone on the free plan (or without an account) reaches for a
 * paid action. It names the thing they just tried to do, so the offer answers
 * their intent instead of interrupting it.
 */
export function UpgradeDialog({ reason, onClose }: { reason: UpgradeReason | null; onClose: () => void }) {
  const [period, setPeriod] = useState<Period>("year");
  const { href, ready, signedIn, onClick } = useCheckout("starter", period);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!reason) return;
    captureEvent("upgrade_prompt_shown", { reason });
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [reason, onClose]);

  if (!reason) return null;
  const y = yearly(starter);
  const ctaPrice = period === "year" && y ? `${krFmt(y.total)} kr./år` : `${krFmt(starter.price)} kr./md.`;
  const c = COPY[reason];
  const Icon = c.icon;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <button type="button" aria-label="Luk" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-h"
        className="relative w-full max-w-md overscroll-contain rounded-t-3xl bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-slate-900 shadow-[0_24px_80px_-20px_rgba(2,6,23,0.6)] sm:rounded-3xl sm:p-8"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Luk"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X aria-hidden size={20} />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon aria-hidden size={20} strokeWidth={1.8} />
        </span>
        <h2 id="upgrade-h" className="mt-4 pr-8 text-[22px] font-semibold leading-tight tracking-[-0.02em] [text-wrap:balance]">
          {c.title}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{c.body}</p>

        <ul className="mt-5 space-y-2 text-[15px] text-slate-700">
          {(DEAL_REASONS.includes(reason) ? PERKS_DEALS : PERKS_REPORT).map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <Check aria-hidden size={17} strokeWidth={2.4} className="mt-0.5 shrink-0 text-emerald-600" />
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <PeriodChoice tierId="starter" period={period} onChange={setPeriod} />
        </div>
        <p className="mt-4 flex items-center gap-2.5 text-[14px] text-slate-600">
          <Coffee aria-hidden size={17} strokeWidth={1.8} className="shrink-0 text-amber-700" />
          <span>
            <span className="font-semibold text-slate-900">{everyday(starter, period).perDayLabel} kr. om dagen.</span> {everyday(starter, period).coffee}.
          </span>
        </p>

        <a
          key={period}
          href={href}
          aria-disabled={!ready}
          onClick={() => onClick(`dialog_${reason}`)}
          className={clsx(
            "mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-[15px] font-semibold text-white shadow-btn ring-1 ring-inset ring-white/10 transition-[background-color,transform] hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]",
            !ready && "pointer-events-none opacity-70",
          )}
        >
          {signedIn ? `Fortsæt med Starter · ${ctaPrice}` : `Opret konto og fortsæt · ${ctaPrice}`}
          <ArrowRight aria-hidden size={16} />
        </a>
        <p className="mt-3 text-center text-[13px] leading-snug text-slate-500">
          {signedIn ? "Sikker betaling via Stripe." : "Du opretter en konto først og går derefter direkte til betaling."}{" "}
          <a href={`/priser?fra=${reason}`} className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900">
            Se alle planer
          </a>
        </p>
      </div>
    </div>
  );
}
