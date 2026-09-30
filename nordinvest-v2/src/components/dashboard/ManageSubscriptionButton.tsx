"use client";

import { useState } from "react";
import { Loader2, Settings } from "lucide-react";

export function ManageSubscriptionButton({
  className,
  label = "Administrer abonnement",
  showIcon = true,
}: {
  className?: string;
  label?: string;
  showIcon?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(
          data.error === "no_subscription"
            ? "Ingen aktivt abonnement fundet."
            : "Kunne ikke åbne abonnementsstyring. Prøv igen.",
        );
        setLoading(false);
      }
    } catch {
      setError("Kunne ikke åbne abonnementsstyring. Prøv igen.");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={open}
        disabled={loading}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
        }
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : showIcon ? <Settings size={16} /> : null}
        {label}
      </button>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
