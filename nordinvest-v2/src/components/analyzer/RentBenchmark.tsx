"use client";

import { useState } from "react";
import { NumberInput } from "@/components/ui/NumberInput";
import { BadgeCheck, TrendingUp, TrendingDown, Minus, Users, Check, X } from "lucide-react";
import { clsx } from "@/lib/clsx";
import { loadSupabase } from "@/lib/supabase/lazy";
import type { RentBenchmark as Bench } from "@/lib/rent";

const dk = (n: number) => Math.round(n).toLocaleString("da-DK");

/**
 * Documented rent benchmark card — shown in the analyzer next to the
 * MarketBenchmark card. Combines DST HUS1 growth with regional baseline AND
 * (once density crosses threshold) real user observations. Also captures new
 * observations via a small inline form, so the dataset compounds over time.
 */
export function RentBenchmark({
  benchmark,
  currentRent,
  region,
  type,
  analysisId,
  areaM2,
  estimated = false,
}: {
  benchmark: Bench;
  currentRent: number; // kr/md the analyzer is using now
  region: string;
  type: string;
  analysisId: string | null;
  areaM2: number | null;
  estimated?: boolean; // the rent is our own estimate, not one the user gave
}) {
  const b = benchmark;
  // Compare the analyzer's per-m² rent to the benchmark
  const currentPerM2 = areaM2 && areaM2 > 10 ? currentRent / areaM2 : null;
  const deltaPct = currentPerM2 != null && b.value > 0 ? ((currentPerM2 - b.value) / b.value) * 100 : null;
  const rounded = deltaPct != null ? Math.round(deltaPct) : null;
  const near = rounded != null && Math.abs(rounded) <= 5;
  const over = rounded != null && rounded > 5;

  const tone = near ? "text-slate-600" : over ? "text-amber-700" : "text-emerald-700";
  const Icon = near ? Minus : over ? TrendingUp : TrendingDown;
  const verdict =
    rounded == null
      ? "Sammenligning kræver ejendommens areal"
      : near
      ? "på niveau med markedet"
      : over
      ? `${rounded} % over markedet`
      : `${Math.abs(rounded)} % under markedet`;

  const tierLabel = b.tier === "documented" ? "Dokumenteret" : "Kalibreret estimat";
  const tierClass =
    b.tier === "documented"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-blue-50 text-blue-700";

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5"
      style={{
        boxShadow:
          "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <div className="flex items-center gap-2">
        <BadgeCheck size={16} className="text-emerald-600" />
        <h3 className="text-[15px] font-semibold text-slate-900">Markedsleje pr. m²</h3>
        <span className={clsx("ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", tierClass)}>
          {tierLabel}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 items-end gap-4">
        <div>
          <div className="text-[13px] font-medium leading-snug text-slate-500">Din leje</div>
          <div className="mt-1 whitespace-nowrap text-2xl font-bold tnum text-slate-900">
            {currentPerM2 != null ? dk(currentPerM2) : "–"}{" "}
            <span className="text-sm font-semibold text-slate-400">kr/m²</span>
          </div>
        </div>
        <div>
          <div className="text-[13px] font-medium leading-snug text-slate-500">Marked · {b.regionLabel}</div>
          <div className="mt-1 whitespace-nowrap text-2xl font-bold tnum text-slate-900">
            {dk(b.value)} <span className="text-sm font-semibold text-slate-400">kr/m²</span>
          </div>
        </div>
      </div>

      {estimated ? (
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Beregningen bruger {Math.round(currentRent).toLocaleString("da-DK")} kr./md., et forsigtigt skøn for postnummeret. Store boliger vægtes lavere pr. m². Kender du lejen, kan du rette den under Justér.
        </p>
      ) : (
        <div className={clsx("mt-4 flex items-center gap-2 text-sm font-semibold", tone)}>
          <Icon size={16} />
          <span>Lejen ligger {verdict}.</span>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Kilde: {b.source}. Vokset {b.growthPct >= 0 ? "+" : ""}
        {b.growthPct.toLocaleString("da-DK")} % siden {b.anchorPeriod}.{" "}
        {b.observations > 0 && (
          <>
            <Users size={11} className="ml-0.5 -mt-0.5 inline text-slate-400" /> {b.observations} bruger-observationer indregnet.
          </>
        )}
      </p>

      {/* User contribution form — small, optional, appears at bottom */}
      {analysisId && (
        <ContributionForm
          analysisId={analysisId}
          region={region}
          type={type}
          areaM2={areaM2}
          suggestedPerM2={b.value}
        />
      )}
    </section>
  );
}

function ContributionForm({
  analysisId,
  region,
  type,
  areaM2,
  suggestedPerM2,
}: {
  analysisId: string;
  region: string;
  type: string;
  areaM2: number | null;
  suggestedPerM2: number;
}) {
  const [step, setStep] = useState<"prompt" | "open" | "saving" | "done" | "dismissed">("prompt");
  const [val, setVal] = useState<string>("");
  // Suggested monthly rent for a comparable unit at same area — makes the ask
  // concrete: "hvad ligger lejen på for lignende, ca. X m²?" not "hvad synes du?".
  const suggestedMonthly = areaM2 && areaM2 > 10 ? Math.round((suggestedPerM2 * areaM2) / 100) * 100 : null;

  const submit = async () => {
    const monthly = Number(val.replace(/[.\s]/g, "").replace(",", "."));
    if (!Number.isFinite(monthly) || monthly < 1000 || monthly > 200000) {
      setStep("open"); // stay open — silently reject nonsense values
      return;
    }
    setStep("saving");
    try {
      const supabase = await loadSupabase();
      if (supabase && areaM2 && areaM2 > 10) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Read current property_data, merge rentObservation, write back.
          const { data: row } = await supabase
            .from("analyses")
            .select("property_data")
            .eq("id", analysisId)
            .single();
          const pd = (row?.property_data ?? {}) as Record<string, unknown>;
          const krPerM2Month = Math.round((monthly / areaM2) * 10) / 10;
          await supabase
            .from("analyses")
            .update({
              property_data: {
                ...pd,
                rentObservation: {
                  region,
                  type,
                  monthly,
                  areaM2,
                  krPerM2Month,
                  at: new Date().toISOString(),
                },
              },
            })
            .eq("id", analysisId)
            .eq("user_id", user.id);
        }
      }
    } catch {
      /* best-effort — always thank the user */
    }
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-emerald-800">
        <Check size={13} /> Tak. Dit tal indgår anonymt i markedslejen.
      </div>
    );
  }
  if (step === "dismissed") return null;

  return (
    <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3">
      {step === "prompt" ? (
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-xs leading-relaxed text-slate-600">
            <Users size={12} className="mr-1 -mt-0.5 inline text-slate-500" />
            <span className="font-semibold text-slate-800">Kender du lejeniveauet i området?</span>{" "}
            Dit tal indgår anonymt i markedslejen.
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setStep("open")}
              className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Bidrag
            </button>
            <button
              onClick={() => setStep("dismissed")}
              aria-label="Luk"
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-xs font-semibold text-slate-800">
            Leje for lignende lejemål{areaM2 ? ` på ca. ${areaM2} m²` : ""} i området
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-slate-200 bg-white focus-within:border-blue-500">
              <NumberInput
                value={val}
                onValueChange={(n) => setVal(n == null ? "" : String(n))}
                placeholder={suggestedMonthly ? `${suggestedMonthly.toLocaleString("da-DK")}` : "fx 12.000"}
                className="w-full rounded-lg bg-transparent px-2.5 py-1.5 text-sm text-slate-900 tabular-nums outline-none"
                autoFocus
              />
              <span className="pr-2.5 text-xs text-slate-400">kr/md.</span>
            </div>
            <button
              onClick={submit}
              disabled={step === "saving" || !val}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {step === "saving" ? "…" : "Send"}
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Anonymt aggregeret. Bruges kun til at forbedre markedslejen for lignende ejendomme.
          </div>
        </>
      )}
    </div>
  );
}
