"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowUpRight, Check, Sparkles } from "lucide-react";
import { tiers, limits } from "@/lib/pricing";
import { clsx } from "@/lib/clsx";

const ORDER = ["free", "starter", "plus", "pro", "unlimited"];

export function UpgradeOptions({ currentTier }: { currentTier: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentIdx = ORDER.indexOf(currentTier);
  const currentMax = limits[(currentTier as keyof typeof limits)] ?? 3;
  const upgrades = tiers.filter((t) => ORDER.indexOf(t.id) > currentIdx && t.id !== "free" && !t.hidden);

  const choose = async (tierId: string) => {
    setBusy(tierId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.ok) {
        setDone(tierId);
        setTimeout(() => router.push("/dashboard?welcome=1"), 1400);
        return;
      }
      setError("Kunne ikke opgradere lige nu. Prøv igen om lidt.");
      setBusy(null);
    } catch {
      setError("Kunne ikke opgradere lige nu. Prøv igen om lidt.");
      setBusy(null);
    }
  };

  if (upgrades.length === 0) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <Sparkles className="mx-auto text-emerald-600" size={28} />
        <p className="mt-3 text-lg font-semibold text-emerald-900">Du er på vores højeste plan</p>
        <p className="mt-1 text-sm text-emerald-700">Ubegrænset adgang til alt. Tak fordi du investerer med NordInvest.</p>
      </div>
    );
  }

  const isSubscriber = currentTier !== "free";

  return (
    <div>
      {isSubscriber && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3.5 text-sm text-blue-800">
          <Sparkles size={18} className="shrink-0 text-blue-600" />
          <span>
            <b>Loyalitetstilbud:</b> som eksisterende kunde betaler du kun forskellen — vi modregner
            automatisk resten af din nuværende periode, når du opgraderer i dag.
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {upgrades.map((t, i) => {
          const max = limits[t.id];
          const extra = max >= 999999 ? "Ubegrænset" : `${max - currentMax} flere`;
          const recommended = i === 0; // nearest upgrade = best value
          const perAnalysis = max >= 999999 ? null : Math.round((t.price / max) * 10) / 10;
          return (
            <div
              key={t.id}
              className={clsx(
                "relative flex flex-col rounded-3xl border p-6",
                recommended ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white",
              )}
            >
              {recommended && (
                <div className="mb-3 inline-block w-fit rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Bedste værdi
                </div>
              )}
              <div className="text-lg font-bold">{t.name}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{t.price} kr.</span>
                <span className={clsx("text-sm", recommended ? "text-slate-400" : "text-slate-500")}>/md</span>
              </div>
              <div className={clsx("mt-1 text-sm font-medium", recommended ? "text-blue-300" : "text-blue-600")}>
                {extra} analyser om måneden
              </div>
              {perAnalysis && (
                <div className={clsx("mt-1 text-xs", recommended ? "text-slate-400" : "text-slate-400")}>
                  ~{perAnalysis.toString().replace(".", ",")} kr. pr. analyse
                </div>
              )}

              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className={clsx("flex items-start gap-2", recommended ? "text-slate-300" : "text-slate-700")}>
                    <Check size={15} className={clsx("mt-0.5 shrink-0", recommended ? "text-blue-400" : "text-emerald-500")} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => choose(t.id)}
                disabled={!!busy}
                className={clsx(
                  "mt-5 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60",
                  recommended ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-slate-900 text-white hover:bg-slate-800",
                )}
              >
                {busy === t.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : done === t.id ? (
                  <Check size={16} />
                ) : (
                  <>Opgradér til {t.name} <ArrowUpRight size={16} /></>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
