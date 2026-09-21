"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Landmark, Waves, MapPin, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { clsx } from "@/lib/clsx";
import type { FutureBurdens, Burden } from "@/lib/future-burdens";

// Icons per burden kind. Kloak-status gets a dedicated wave icon so it's
// instantly recognisable — this is the single most-searched future burden
// for DK-property investors.
function iconFor(kind: Burden["kind"]) {
  switch (kind) {
    case "lokalplan-forslag":
      return AlertTriangle;
    case "lokalplan-forslag-nabolag":
      return MapPin;
    case "lokalplan-vedtaget":
      return Landmark;
    case "kommuneplanramme":
      return Landmark;
    case "kloakopland":
      return Waves;
    default:
      return CheckCircle2;
  }
}

const SEVERITY_TONE: Record<Burden["severity"], { badge: string; text: string; ring: string; iconTint: string; label: string }> = {
  burden: {
    badge: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-200",
    iconTint: "text-amber-600",
    label: "Byrde",
  },
  watch: {
    badge: "bg-blue-50",
    text: "text-blue-800",
    ring: "ring-blue-200",
    iconTint: "text-blue-600",
    label: "Hold øje",
  },
  safe: {
    badge: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-200",
    iconTint: "text-slate-500",
    label: "Kontekst",
  },
};

/**
 * Fremtidige byrder — surfaces public planning data (lokalplaner, kloakopland,
 * kommuneplanrammer) that no other DK analyzer exposes. Fetches on mount when
 * an address is available; degrades silently when the coordinate lookup fails.
 */
export function FutureBurdens({ address }: { address: string | null }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "ok" | "fail"; data?: FutureBurdens }>({ status: "idle" });

  useEffect(() => {
    if (!address || address.trim().length < 4) {
      setState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const r = await fetch(`/api/burdens?address=${encodeURIComponent(address)}`);
        const j = (await r.json()) as { ok: boolean } & FutureBurdens;
        if (cancelled) return;
        if (j.ok) setState({ status: "ok", data: j });
        else setState({ status: "fail" });
      } catch {
        if (!cancelled) setState({ status: "fail" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address || state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" />
          Tjekker offentlige planer på adressen…
        </div>
      </section>
    );
  }

  if (state.status === "fail" || !state.data) {
    return null; // silent degradation
  }

  const { burdens, checkedAt } = state.data;

  // Sort by severity: burden → watch → safe
  const order: Record<Burden["severity"], number> = { burden: 0, watch: 1, safe: 2 };
  const sorted = [...burdens].sort((a, b) => order[a.severity] - order[b.severity]);
  const burdenCount = burdens.filter((b) => b.severity === "burden").length;
  const watchCount = burdens.filter((b) => b.severity === "watch").length;

  if (sorted.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">Fremtidige byrder</h3>
          <span className="ml-auto inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Ingen fundet
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Ingen aktuelle lokalplan-forslag, ingen kloak-varsler og ingen atypiske kommuneplan-rammer på adressen.
          Baseret på Erhvervsstyrelsens Plandata.dk pr. {new Date(checkedAt).toLocaleDateString("da-DK")}.
        </p>
      </section>
    );
  }

  const headline =
    burdenCount > 0
      ? `${burdenCount} byrde${burdenCount !== 1 ? "r" : ""}${watchCount > 0 ? ` · ${watchCount} at holde øje med` : ""}`
      : watchCount > 0
      ? `${watchCount} plan${watchCount !== 1 ? "er" : ""} at holde øje med`
      : "Kontekst fra Plandata";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <Landmark size={16} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">Fremtidige byrder</h3>
        <span
          className={clsx(
            "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
            burdenCount > 0
              ? "bg-amber-50 text-amber-700 ring-amber-200"
              : watchCount > 0
              ? "bg-blue-50 text-blue-700 ring-blue-200"
              : "bg-slate-100 text-slate-600 ring-slate-200",
          )}
        >
          {headline}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {sorted.map((b, i) => {
          const tone = SEVERITY_TONE[b.severity];
          const Icon = iconFor(b.kind);
          return (
            <div
              key={`${b.kind}-${b.planNr ?? i}`}
              className={clsx(
                "flex items-start gap-3 rounded-xl border p-3",
                b.severity === "burden"
                  ? "border-amber-200 bg-amber-50/40"
                  : b.severity === "watch"
                  ? "border-blue-200 bg-blue-50/40"
                  : "border-slate-200 bg-white",
              )}
            >
              <div className={clsx("mt-0.5 shrink-0", tone.iconTint)}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="min-w-0 text-[13px] font-semibold text-slate-900">{b.title}</span>
                  <span
                    className={clsx(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
                      tone.badge,
                      tone.text,
                    )}
                  >
                    {tone.label}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-snug text-slate-600">{b.detail}</p>
                {(b.meta || b.planLink) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    {b.meta && <span>{b.meta}</span>}
                    {b.planLink && (
                      <a
                        href={b.planLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-800"
                      >
                        Se plan <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Kilde: Plandata.dk (Erhvervsstyrelsen) + DAWA. Tjekket {new Date(checkedAt).toLocaleDateString("da-DK")}.
        Beslutningsstøtte — bekræft altid med kommunens spildevandsplan og gældende lokalplan hos kommunen.
      </p>
    </section>
  );
}
