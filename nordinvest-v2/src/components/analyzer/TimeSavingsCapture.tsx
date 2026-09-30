"use client";

import { useState } from "react";
import { Clock, Check, X } from "lucide-react";
import { clsx } from "@/lib/clsx";

// The decisive validation metric: how much time the analysis saved versus doing
// it by hand, plus whether the numbers held up. One tap each, shown once per
// analysis. Feeds the admin validation cockpit (median time saved, accuracy).

const TIME_OPTIONS = [
  { label: "Under 15 min", minutes: 7 },
  { label: "15 til 30 min", minutes: 22 },
  { label: "30 til 60 min", minutes: 45 },
  { label: "1 til 2 timer", minutes: 90 },
  { label: "Over 2 timer", minutes: 150 },
];

const ACCURACY = [
  { key: "matched", label: "Ja, tallene passede" },
  { key: "minor", label: "Rettede småting" },
  { key: "major", label: "Store afvigelser" },
];

export function TimeSavingsCapture({
  onSubmit,
  onDismiss,
}: {
  onSubmit: (manualMinutes: number, accuracy: string) => Promise<void> | void;
  onDismiss?: () => void;
}) {
  const [minutes, setMinutes] = useState<number | null>(null);
  const [step, setStep] = useState<"time" | "accuracy" | "saving" | "done">("time");

  const pickTime = (m: number) => {
    setMinutes(m);
    setStep("accuracy");
  };

  const pickAccuracy = async (acc: string) => {
    setStep("saving");
    try {
      await onSubmit(minutes ?? 0, acc);
    } catch {
      /* best-effort — still thank the user */
    }
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-800">
        <Check size={16} /> Tak. Det hjælper os med at vise, hvor meget tid værktøjet sparer.
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Luk"
          className="absolute right-3 top-3 text-slate-300 transition-colors hover:text-slate-500"
        >
          <X size={15} />
        </button>
      )}
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Clock size={16} className="text-blue-600" />
        {step === "time" || step === "saving"
          ? "Hvor lang tid ville det tage dig at nå hertil manuelt?"
          : "Passede tallene, eller måtte du rette noget?"}
      </div>

      {step !== "accuracy" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {TIME_OPTIONS.map((o) => (
            <button
              key={o.minutes}
              onClick={() => pickTime(o.minutes)}
              disabled={step === "saving"}
              className={clsx(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                minutes === o.minutes
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {ACCURACY.map((a) => (
            <button
              key={a.key}
              onClick={() => pickAccuracy(a.key)}
              className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-600"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
